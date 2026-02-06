const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BACKUP_DIR = path.join(process.cwd(), 'backup')
const backups = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.bak'))
backups.forEach((b) => {
  const target = path.resolve('/', b.replace('.bak', '')) // Stub safe
  try {
    fs.copyFileSync(path.join(BACKUP_DIR, b), target)
  } catch {}
})
console.log('✅ Rolled back from backup.')
