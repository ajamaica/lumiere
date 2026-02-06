const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');
const crypto = require('crypto');
const { Transform } = require('stream');

const MAGIC = Buffer.from('OCM1');
const VERSION = 1;
const ALGO_GCM = 1;
const AUTH_TAG_LEN = 16;

class GcmTagSplitter extends Transform {
  constructor() {
    super();
    this.tail = Buffer.alloc(0);
  }

  _transform(chunk, enc, cb) {
    this.tail = Buffer.concat([this.tail, chunk]);
    if (this.tail.length > AUTH_TAG_LEN) {
      const emitLen = this.tail.length - AUTH_TAG_LEN;
      this.push(this.tail.slice(0, emitLen));
      this.tail = this.tail.slice(emitLen);
    }
    cb();
  }

  _flush(cb) {
    this.emit('tag', this.tail);
    cb();
  }
}

async function readExact(stream, n) {
  return new Promise((resolve, reject) => {
    let buf = Buffer.alloc(0);
    function onData(chunk) {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length >= n) {
        stream.pause();
        stream.removeListener('data', onData);
        stream.removeListener('error', onErr);
        const needed = buf.slice(0, n);
        const rest = buf.slice(n);
        if (rest.length) stream.unshift(rest);
        resolve(needed);
      }
    }
    function onErr(err) {
      reject(err);
    }
    stream.on('data', onData);
    stream.on('error', onErr);
    stream.resume();
  });
}

async function readHeader(input) {
  const fixed = await readExact(input, 8);
  if (!fixed.slice(0, 4).equals(MAGIC)) throw new Error('Invalid archive: bad magic');
  const version = fixed.readUInt8(4);
  const algo = fixed.readUInt8(5);
  const saltLen = fixed.readUInt8(6);
  const ivLen = fixed.readUInt8(7);
  if (version !== VERSION || algo !== ALGO_GCM) throw new Error('Unsupported archive version/algorithm');
  const rest = await readExact(input, saltLen + ivLen);
  const salt = rest.slice(0, saltLen);
  const iv = rest.slice(saltLen);
  return { salt, iv };
}

async function restoreArchive(archivePath, targetDir, password) {
  return new Promise(async (resolve, reject) => {
    const input = fs.createReadStream(archivePath);
    try {
      const { salt, iv } = await readHeader(input);
      const key = crypto.scryptSync(password, salt, 32);
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

      const splitter = new GcmTagSplitter();
      splitter.on('tag', (tag) => {
        try {
          decipher.setAuthTag(tag);
        } catch (e) {
          reject(new Error('Invalid auth tag'));
        }
      });

      const extractor = tar.x({
        cwd: targetDir,
        onentry: (entry) => {
          console.log(`Extracting: ${entry.path}`);
        }
      });

      decipher.on('error', () => reject(new Error('Decryption failed (Wrong password or corrupted archive)')));
      extractor.on('error', reject);
      extractor.on('end', () => {
        console.log('🔓 Decryption & Extraction complete.');
        resolve();
      });

      input.pipe(splitter).pipe(decipher).pipe(extractor);
    } catch (e) {
      reject(e);
    }
  });
}

async function fixPaths(targetDir) {
  const configPath = path.join(targetDir, '.openclaw/openclaw.json');
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (fs.existsSync(configPath)) {
    console.log('🔧 Fixing paths in openclaw.json...');
    const json = await fs.readJson(configPath);
    const manifest = fs.existsSync(manifestPath) ? await fs.readJson(manifestPath) : {};
    const oldWorkspace = manifest?.workspace || json?.agents?.defaults?.workspace;
    const newWorkspace = path.join(targetDir, 'clawd');

    if (oldWorkspace && json?.agents?.defaults) {
      json.agents.defaults.workspace = newWorkspace;
      await fs.writeJson(configPath, json, { spaces: 2 });
      console.log('✅ Paths updated.');
    }
  }
}

// CLI Driver
if (require.main === module) {
    const archive = path.join(__dirname, '../test-data/test-archive.oca');
    const dest = path.join(__dirname, '../test-data/restore-site');
    const pass = process.env.MIGRATOR_PASSWORD;

    if (!pass) {
        console.error("Error: MIGRATOR_PASSWORD env var required");
        process.exit(1);
    }

    fs.ensureDirSync(dest);

    restoreArchive(archive, dest, pass)
        .then(() => fixPaths(dest))
        .then(() => console.log("✅ Restore Done."))
        .catch(err => console.error("❌ Failed:", err));
}

module.exports = { restoreArchive, fixPaths };
