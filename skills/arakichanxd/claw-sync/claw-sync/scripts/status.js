#!/usr/bin/env node
/**
 * Claw Sync - Status Script
 * Shows sync status and local backup info
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace')
const LOCAL_BACKUP_DIR = path.join(OPENCLAW_DIR, '.local-backup')

function loadEnv() {
  const envFile = path.join(OPENCLAW_DIR, '.backup.env')
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8')
    content.split('\n').forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.+)$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim()
      }
    })
  }
}

function isConfigured() {
  const repo = process.env.BACKUP_REPO
  const token = process.env.BACKUP_TOKEN
  return repo && token && !token.includes('xxxx') && !token.includes('YOUR_')
}

function main() {
  loadEnv()

  const repo = process.env.BACKUP_REPO
  const configured = isConfigured()

  console.log('📊 Claw Sync Status\n')

  // Configuration status
  if (!configured) {
    console.log('⚠️  Not configured')
    console.log('')
    console.log('Create ~/.openclaw/.backup.env with:')
    console.log('  BACKUP_REPO=https://github.com/username/repo')
    console.log('  BACKUP_TOKEN=ghp_your_token')
    console.log('')
    return
  }

  console.log(`✅ Configured`)
  console.log(`📁 Repository: ${repo}`)
  console.log('')

  // Files to sync
  console.log('📝 Files to sync:')

  const checks = [
    ['MEMORY.md', path.join(WORKSPACE_DIR, 'MEMORY.md')],
    ['USER.md', path.join(WORKSPACE_DIR, 'USER.md')],
    ['SOUL.md', path.join(WORKSPACE_DIR, 'SOUL.md')],
    ['IDENTITY.md', path.join(WORKSPACE_DIR, 'IDENTITY.md')],
    ['TOOLS.md', path.join(WORKSPACE_DIR, 'TOOLS.md')],
    ['AGENTS.md', path.join(WORKSPACE_DIR, 'AGENTS.md')],
  ]

  for (const [name, filePath] of checks) {
    const exists = fs.existsSync(filePath)
    const size = exists ? fs.statSync(filePath).size : 0
    const sizeStr = exists ? `${(size / 1024).toFixed(1)}KB` : 'missing'
    console.log(`  ${exists ? '✅' : '⏭️ '} ${name} (${sizeStr})`)
  }

  // Count memory files
  const memoryDir = path.join(WORKSPACE_DIR, 'memory')
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'))
    console.log(`  ✅ memory/*.md (${files.length} files)`)
  }

  // Count skills
  const skillsDir = path.join(WORKSPACE_DIR, 'skills')
  if (fs.existsSync(skillsDir)) {
    const skills = fs
      .readdirSync(skillsDir)
      .filter((f) => fs.statSync(path.join(skillsDir, f)).isDirectory())
    console.log(`  ✅ skills/ (${skills.length} skills)`)
  }

  console.log('')
  console.log('🔒 NOT synced (security): openclaw.json, .env')

  // Local backups
  console.log('\n💾 Local backups (disaster recovery):')
  if (fs.existsSync(LOCAL_BACKUP_DIR)) {
    const backups = fs
      .readdirSync(LOCAL_BACKUP_DIR)
      .filter((f) => fs.statSync(path.join(LOCAL_BACKUP_DIR, f)).isDirectory())
      .sort()
      .reverse()
      .slice(0, 5)

    if (backups.length > 0) {
      backups.forEach((b, i) => {
        const marker = i === 0 ? ' (latest)' : ''
        console.log(`  📦 ${b}${marker}`)
      })
    } else {
      console.log('  No local backups yet')
    }
  } else {
    console.log('  No local backups yet')
  }

  // Commands
  console.log('\n💡 Commands:')
  console.log('  node skills/claw-sync/scripts/push.js           # Push to remote')
  console.log('  node skills/claw-sync/scripts/push.js --dry-run # Preview')
  console.log('  node skills/claw-sync/scripts/pull.js --list    # List versions')
  console.log('  node skills/claw-sync/scripts/pull.js           # Restore latest')
}

main()
