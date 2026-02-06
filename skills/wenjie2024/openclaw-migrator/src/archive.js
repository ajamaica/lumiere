const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

const MAGIC = Buffer.from('OCM1');
const VERSION = 1;
const ALGO_GCM = 1;

function buildHeader({ salt, iv }) {
  const header = Buffer.alloc(8);
  MAGIC.copy(header, 0);
  header.writeUInt8(VERSION, 4);
  header.writeUInt8(ALGO_GCM, 5);
  header.writeUInt8(salt.length, 6);
  header.writeUInt8(iv.length, 7);
  return Buffer.concat([header, salt, iv]);
}

async function createArchive(sourceDirs, outputPath, password) {
  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(outputPath);

    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const header = buildHeader({ salt, iv });
    output.write(header);

    const archive = archiver('tar', { gzip: true });
    archive.on('error', reject);

    // Add manifest with workspace root (if available)
    const manifest = await buildManifest(sourceDirs).catch(() => null);
    if (manifest) {
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    }

    for (const dir of sourceDirs) {
      if (fs.existsSync(dir)) {
        archive.directory(dir, path.basename(dir));
      } else {
        console.warn(`⚠️ Warning: Source dir not found: ${dir}`);
      }
    }

    // Pipe archive -> cipher -> output (keep output open for authTag)
    archive.pipe(cipher).pipe(output, { end: false });

    cipher.on('end', () => {
      const authTag = cipher.getAuthTag();
      output.write(authTag);
      output.end();
    });

    output.on('close', () => resolve());
    output.on('error', reject);

    archive.finalize();
  });
}

async function buildManifest(sourceDirs) {
  // Try to read workspace from openclaw.json if present
  const configDir = sourceDirs.find((d) => path.basename(d) === '.openclaw');
  if (!configDir) return null;
  const configPath = path.join(configDir, 'openclaw.json');
  if (!fs.existsSync(configPath)) return null;
  const json = await fs.readJson(configPath);
  const workspace = json?.agents?.defaults?.workspace || null;
  return { workspace, createdAt: new Date().toISOString() };
}

// CLI Driver
if (require.main === module) {
    const src = [
        path.join(__dirname, '../test-data/.openclaw'),
        path.join(__dirname, '../test-data/clawd')
    ];
    const dest = path.join(__dirname, '../test-data/test-archive.oca');
    const pass = process.env.MIGRATOR_PASSWORD;

    if (!pass) {
        console.error("Error: MIGRATOR_PASSWORD env var required");
        process.exit(1);
    }

    createArchive(src, dest, pass)
        .then(() => console.log("✅ Done."))
        .catch(err => console.error("❌ Failed:", err));
}

module.exports = { createArchive };
