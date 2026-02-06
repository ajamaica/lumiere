#!/usr/bin/env node
/**
 * Claw Sync - Pull Script
 * Restores OpenClaw memory/workspace from GitHub
 *
 * Features:
 * - Restore specific version or latest
 * - Local backup before restore (disaster recovery)
 * - Path traversal protection
 * - Cross-platform
 *
 * Usage:
 *   node pull.js                     # Restore latest
 *   node pull.js --list              # List available versions
 *   node pull.js --version backup-20260202-1430   # Restore specific version
 *   node pull.js --force             # Skip confirmation
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')
const readline = require('readline')

// Config
const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace')
const RESTORE_DIR = path.join(OPENCLAW_DIR, '.sync-restore')
const LOCAL_BACKUP_DIR = path.join(OPENCLAW_DIR, '.local-backup')

// Security: Allowed git hosts
const ALLOWED_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org']

// Parse args
const args = process.argv.slice(2)
const LIST_MODE = args.includes('--list')
const FORCE_MODE = args.includes('--force')
const VERSION_INDEX = args.indexOf('--version')
const RAW_VERSION = VERSION_INDEX !== -1 ? args[VERSION_INDEX + 1] : null

// Security: Validate version tag format (prevent command injection)
function isValidTagName(tag) {
  if (!tag) return true // null is ok (means latest)
  // Only allow: backup-YYYYMMDD-HHMM format
  return /^backup-\d{8}-\d{4}$/.test(tag)
}

const TARGET_VERSION = RAW_VERSION
if (RAW_VERSION && !isValidTagName(RAW_VERSION)) {
  console.error('❌ Invalid version format. Expected: backup-YYYYMMDD-HHMM')
  console.error('   Example: backup-20260202-1430')
  process.exit(1)
}

// Load env
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

// Security: Validate repository URL
function validateRepoUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      throw new Error('Repository URL must use HTTPS')
    }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      throw new Error(`Repository must be on: ${ALLOWED_HOSTS.join(', ')}`)
    }
    return true
  } catch (err) {
    console.error(`❌ Invalid repository URL: ${err.message}`)
    process.exit(1)
  }
}

// Check configuration
function checkConfig() {
  const repo = process.env.BACKUP_REPO
  const token = process.env.BACKUP_TOKEN

  if (!repo || !token) {
    console.error('❌ Sync not configured!')
    console.error('')
    console.error('Create ~/.openclaw/.backup.env with:')
    console.error('  BACKUP_REPO=https://github.com/username/repo')
    console.error('  BACKUP_TOKEN=ghp_your_token_here')
    process.exit(1)
  }

  if (token.includes('xxxx') || token.includes('YOUR_')) {
    console.error('❌ Please replace the placeholder token with your real token')
    process.exit(1)
  }

  validateRepoUrl(repo)
}

// Security: Execute git command without exposing token in errors
function safeExec(cmd, options = {}) {
  try {
    return execSync(cmd, { ...options, encoding: 'utf8' })
  } catch (err) {
    let msg = err.message || 'Unknown error'
    const token = process.env.BACKUP_TOKEN
    if (token) {
      msg = msg.replace(new RegExp(token, 'g'), '***TOKEN***')
    }
    throw new Error(msg)
  }
}

// Security: Validate filename (prevent path traversal)
function isValidFilename(filename) {
  // Reject if contains path traversal or absolute paths
  if (
    filename.includes('..') ||
    filename.startsWith('/') ||
    filename.startsWith('\\') ||
    /^[a-zA-Z]:/.test(filename)
  ) {
    return false
  }
  // Only allow alphanumeric, dash, underscore, dot
  return /^[\w\-\.]+$/.test(filename)
}

// Create local backup before restore (disaster recovery)
function createLocalBackup() {
  console.log('💾 Creating local backup before restore...')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(LOCAL_BACKUP_DIR, timestamp)

  fs.mkdirSync(backupPath, { recursive: true })

  // Backup current workspace
  if (fs.existsSync(WORKSPACE_DIR)) {
    const files = ['MEMORY.md', 'USER.md', 'SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'AGENTS.md']
    for (const file of files) {
      const src = path.join(WORKSPACE_DIR, file)
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(backupPath, file))
      }
    }

    // Backup memory dir
    const memoryDir = path.join(WORKSPACE_DIR, 'memory')
    if (fs.existsSync(memoryDir)) {
      const destMemory = path.join(backupPath, 'memory')
      fs.mkdirSync(destMemory, { recursive: true })
      for (const f of fs.readdirSync(memoryDir)) {
        if (f.endsWith('.md')) {
          fs.copyFileSync(path.join(memoryDir, f), path.join(destMemory, f))
        }
      }
    }
  }

  console.log(`✅ Local backup saved: ${backupPath}`)
  return backupPath
}

// List available versions
function listVersions() {
  const repo = process.env.BACKUP_REPO
  const token = process.env.BACKUP_TOKEN
  const repoUrl = repo.replace('https://', `https://${token}@`)

  console.log('📋 Fetching available versions...\n')

  try {
    // Clone with all tags
    if (fs.existsSync(RESTORE_DIR)) {
      fs.rmSync(RESTORE_DIR, { recursive: true })
    }

    safeExec(`git clone --bare ${repoUrl} ${RESTORE_DIR}`, { stdio: 'pipe' })
    process.chdir(RESTORE_DIR)

    const tagsOutput = safeExec('git tag -l --sort=-creatordate', { stdio: 'pipe' })
    const tags = tagsOutput
      .trim()
      .split('\n')
      .filter((t) => t.startsWith('backup-'))

    if (tags.length === 0) {
      console.log('No backup versions found.')
      console.log('Run `node push.js` to create your first backup.')
    } else {
      console.log('Available versions:\n')
      tags.forEach((tag, i) => {
        const marker = i === 0 ? ' (latest)' : ''
        console.log(`  🏷️  ${tag}${marker}`)
      })
      console.log('')
      console.log('To restore a specific version:')
      console.log(`  node pull.js --version ${tags[0]}`)
    }
  } catch (err) {
    console.error('❌ Failed to list versions:', err.message)
  } finally {
    process.chdir(os.homedir())
    if (fs.existsSync(RESTORE_DIR)) {
      fs.rmSync(RESTORE_DIR, { recursive: true })
    }
  }
}

// Prompt for confirmation
async function confirm(message) {
  if (FORCE_MODE) return true

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

// Safely copy file with path validation
function safeCopyFile(src, dest) {
  const filename = path.basename(src)
  if (!isValidFilename(filename)) {
    console.log(`⚠️  Skipping unsafe filename: ${filename}`)
    return false
  }

  if (!fs.existsSync(src)) return false
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`✅ Restored: ${path.basename(dest)}`)
  return true
}

// Main
async function main() {
  loadEnv()
  checkConfig()

  const repo = process.env.BACKUP_REPO
  const token = process.env.BACKUP_TOKEN

  // List mode
  if (LIST_MODE) {
    listVersions()
    return
  }

  console.log('📥 Claw Sync - Restore\n')
  console.log(`Repository: ${repo}`)
  if (TARGET_VERSION) {
    console.log(`Version: ${TARGET_VERSION}`)
  } else {
    console.log('Version: latest')
  }
  console.log('')

  // Confirm restore
  const confirmed = await confirm('⚠️  This will overwrite local files. Continue?')
  if (!confirmed) {
    console.log('Restore cancelled.')
    return
  }

  // Create local backup first (disaster recovery)
  const localBackup = createLocalBackup()

  // Clean restore area
  if (fs.existsSync(RESTORE_DIR)) {
    fs.rmSync(RESTORE_DIR, { recursive: true })
  }

  // Clone repo
  const repoUrl = repo.replace('https://', `https://${token}@`)

  try {
    console.log('\n📡 Cloning repository...')

    if (TARGET_VERSION) {
      // Clone specific tag
      safeExec(`git clone --depth 1 --branch ${TARGET_VERSION} ${repoUrl} ${RESTORE_DIR}`, {
        stdio: 'pipe',
      })
    } else {
      // Clone latest
      safeExec(`git clone --depth 1 ${repoUrl} ${RESTORE_DIR}`, { stdio: 'pipe' })
    }
  } catch (err) {
    console.error('❌ Clone failed:', err.message)
    console.log(`\n💡 Your local backup is safe at: ${localBackup}`)
    process.exit(1)
  }

  // Show metadata
  const metadataPath = path.join(RESTORE_DIR, 'SYNC_METADATA.json')
  if (fs.existsSync(metadataPath)) {
    const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    console.log(`\n📅 Backup from: ${meta.timestamp}`)
    console.log(`🏷️  Version: ${meta.tag || 'unknown'}`)
    console.log(`🖥️  Source: ${meta.hostname}`)
  }

  // Restore workspace files
  const backupWorkspace = path.join(RESTORE_DIR, 'workspace')
  if (fs.existsSync(backupWorkspace)) {
    console.log('\n📁 Restoring workspace...')

    const files = ['MEMORY.md', 'USER.md', 'SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'AGENTS.md']
    for (const file of files) {
      safeCopyFile(path.join(backupWorkspace, file), path.join(WORKSPACE_DIR, file))
    }

    // Restore memory logs
    const backupMemory = path.join(backupWorkspace, 'memory')
    if (fs.existsSync(backupMemory)) {
      console.log('\n📅 Restoring daily logs...')
      fs.mkdirSync(path.join(WORKSPACE_DIR, 'memory'), { recursive: true })
      for (const file of fs.readdirSync(backupMemory)) {
        if (isValidFilename(file)) {
          safeCopyFile(path.join(backupMemory, file), path.join(WORKSPACE_DIR, 'memory', file))
        }
      }
    }

    // Restore skills
    const backupSkills = path.join(backupWorkspace, 'skills')
    if (fs.existsSync(backupSkills)) {
      console.log('\n🔧 Restoring skills...')
      fs.mkdirSync(path.join(WORKSPACE_DIR, 'skills'), { recursive: true })
      for (const skill of fs.readdirSync(backupSkills)) {
        if (!isValidFilename(skill)) {
          console.log(`⚠️  Skipping unsafe skill name: ${skill}`)
          continue
        }
        const src = path.join(backupSkills, skill)
        const dest = path.join(WORKSPACE_DIR, 'skills', skill)
        if (fs.statSync(src).isDirectory()) {
          if (fs.existsSync(dest)) {
            fs.rmSync(dest, { recursive: true })
          }
          fs.cpSync(src, dest, { recursive: true })
          console.log(`✅ Restored: skills/${skill}`)
        }
      }
    }
  }

  // Cleanup
  fs.rmSync(RESTORE_DIR, { recursive: true })

  console.log('\n✅ Restore complete!')
  console.log('')
  console.log('📝 Notes:')
  console.log(`   - Local backup saved at: ${localBackup}`)
  console.log('   - Config files (openclaw.json, .env) were NOT restored')
  console.log('   - Restart OpenClaw if running')
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
