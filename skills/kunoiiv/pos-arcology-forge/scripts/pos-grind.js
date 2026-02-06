const crypto = require('crypto')
const fs = require('fs').promises
const path = require('path')
const readline = require('readline')

async function validateSchema(obj) {
  const required = ['radius_km', 'pop_m']
  for (let k of required) if (!(k in obj)) throw new Error(`Missing: ${k}`)
  obj.radius_km = Math.max(0.5, Math.min(50, obj.radius_km))
  obj.pop_m = Math.max(1000, Math.min(1e10, obj.pop_m))
  return obj
}

async function treeHash(dir) {
  const hash = crypto.createHash('sha256')
  async function walker(p) {
    try {
      const entries = await fs.readdir(p, { withFileTypes: true })
      for (let entry of entries) {
        const full = path.join(p, entry.name)
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          await walker(full)
        } else if (entry.size < 1e7) {
          const data = await fs.readFile(full)
          hash.update(data)
        }
      }
    } catch {}
  }
  await walker(dir)
  return hash.digest('hex')
}

async function grind(inputPath, prefix = '0000', timeoutMs = 300000) {
  let input
  try {
    input = JSON.parse(await fs.readFile(inputPath, 'utf8'))
    await validateSchema(input.sim || input)
  } catch (e) {
    if (inputPath.endsWith('.json')) throw new Error(`Invalid JSON/schema: ${e.message}`)
    input = { treeHash: await treeHash(inputPath) }
  }

  const start = Date.now()
  let nonce = 0
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const timeoutId = setTimeout(() => {
    rl.close()
    throw new Error(`Timeout ${timeoutMs / 1000}s - needs GPU`)
  }, timeoutMs)

  try {
    while (true) {
      const data = JSON.stringify({ ...input, nonce, timestamp: Date.now() })
      const h = crypto.createHash('sha256').update(data).digest('hex')
      if (h.startsWith(prefix)) {
        clearTimeout(timeoutId)
        rl.close()
        const share = { hash: h, nonce, prefix, ...input }
        await fs.writeFile('share.pos.json', JSON.stringify(share, null, 2))
        console.log('✅ PoSH Valid!', JSON.stringify(share, null, 2))
        return share
      }
      nonce++
      if (nonce % 10000 === 0) {
        const elapsed = (Date.now() - start) / 1000
        const rate = nonce / elapsed
        process.stderr.write(`Grinding... ${nonce} (ETA: ${Math.round(65e3 / rate)}s)\r`)
      }
    }
  } finally {
    clearTimeout(timeoutId)
    rl.close()
  }
}

async function verify(inputPath) {
  const share = JSON.parse(await fs.readFile(inputPath, 'utf8'))
  const inputHash = share.treeHash || (await treeHash(share.path || '.'))
  const testData = JSON.stringify({ ...share, treeHash: inputHash, nonce: share.nonce })
  const testH = crypto.createHash('sha256').update(testData).digest('hex')
  if (testH === share.hash) {
    console.log('✅ VALID PoSH!')
    return true
  } else {
    console.log('❌ TAMPERED!')
    return false
  }
}

if (require.main === module) {
  const input = process.argv[2]
  const prefix = process.argv[3] || '0000'
  const timeout_s = process.argv[4] || '300'
  const isVerify = process.argv.includes('--verify')
  if (!input) {
    console.log('Usage: node pos-grind.js <input.json/folder> [--verify] [prefix] [timeout_s]')
    process.exit(1)
  }
  ;(async () => {
    try {
      if (isVerify) {
        await verify(input)
      } else {
        await grind(input, prefix, parseInt(timeout_s) * 1000)
      }
    } catch (e) {
      console.error('💥', e.message)
      process.exit(1)
    }
  })()
}

module.exports = { grind, verify, treeHash, validateSchema }
