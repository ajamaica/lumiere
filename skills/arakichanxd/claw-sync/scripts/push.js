#!/usr/bin/env node
/**
 * Claw Sync - Push Script
 * Pushes OpenClaw memory/workspace to GitHub with versioned backups
 *
 * Features:
 * - Versioned backups with git tags (can restore any version)
 * - Security: No config files, validated URLs, sanitized errors
 * - Cross-platform: Works on Windows, Mac, Linux
 *
 * Usage:
 *   node push.js              # Normal push
 *   node push.js --dry-run    # Show what would be pushed
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')

// Config
const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw')
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace')
const STAGING_DIR = path.join(OPENCLAW_DIR, '.sync-staging')

// Security: Allowed git hosts
const ALLOWED_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org']

// Parse args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

// Load env from .backup.env
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

// Security: Validate token format
function validateToken(token) {
  // GitHub tokens start with ghp_, gho_, ghu_, ghs_, ghr_
  // GitLab tokens are typically glpat-
  const validPrefixes = ['ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_', 'glpat-']
  if (!validPrefixes.some((p) => token.startsWith(p))) {
    console.warn('⚠️  Token format not recognized. Proceeding anyway...')
  }
  if (token.length < 20) {
    console.error('❌ Token appears too short')
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
  validateToken(token)
}

// Security: Sanitize string for git commit message
function sanitizeForGit(str) {
  return str.replace(/[`$"\\]/g, '')
}

// Copy file with optional transform
function copyFile(src, dest, transform = null) {
  if (!fs.existsSync(src)) {
    if (!DRY_RUN) console.log(`⏭️  Skipping (not found): ${path.basename(src)}`)
    return false
  }

  if (DRY_RUN) {
    console.log(`  📄 ${path.basename(src)}`)
    return true
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  let content = fs.readFileSync(src, 'utf8')
  if (transform) content = transform(content)
  fs.writeFileSync(dest, content)
  console.log(`✅ ${path.basename(src)}`)
  return true
}

// Generate backup tag name
function generateTagName() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `backup-${y}${m}${d}-${h}${min}`
}

// Security: Execute git command without exposing token in errors
function safeExec(cmd, options = {}) {
  try {
    return execSync(cmd, { ...options, encoding: 'utf8' })
  } catch (err) {
    // Sanitize error message to remove any tokens
    let msg = err.message || 'Unknown error'
    const token = process.env.BACKUP_TOKEN
    if (token) {
      msg = msg.replace(new RegExp(token, 'g'), '***TOKEN***')
    }
    throw new Error(msg)
  }
}

// Main
async function main() {
  loadEnv()
  checkConfig()

  const repo = process.env.BACKUP_REPO
  const token = process.env.BACKUP_TOKEN
  const timestamp = new Date().toISOString()
  const tagName = generateTagName()

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - showing what would be synced:\n')
  } else {
    console.log('🔧 Preparing sync...\n')
  }

  // Clean staging area
  if (!DRY_RUN) {
    if (fs.existsSync(STAGING_DIR)) {
      fs.rmSync(STAGING_DIR, { recursive: true })
    }
    fs.mkdirSync(STAGING_DIR, { recursive: true })
  }

  // Memory files
  console.log('📝 Memory files:')
  const memoryFiles = ['MEMORY.md', 'USER.md', 'SOUL.md', 'IDENTITY.md', 'TOOLS.md', 'AGENTS.md']
  for (const file of memoryFiles) {
    copyFile(path.join(WORKSPACE_DIR, file), path.join(STAGING_DIR, 'workspace', file))
  }

  // Daily logs
  const memoryDir = path.join(WORKSPACE_DIR, 'memory')
  if (fs.existsSync(memoryDir)) {
    console.log('\n📅 Daily logs:')
    if (!DRY_RUN) fs.mkdirSync(path.join(STAGING_DIR, 'workspace/memory'), { recursive: true })
    const logs = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'))
    for (const file of logs) {
      copyFile(path.join(memoryDir, file), path.join(STAGING_DIR, 'workspace/memory', file))
    }
  }

  // Custom skills
  const skillsDir = path.join(WORKSPACE_DIR, 'skills')
  if (fs.existsSync(skillsDir)) {
    console.log('\n🔧 Skills:')
    if (!DRY_RUN) fs.mkdirSync(path.join(STAGING_DIR, 'workspace/skills'), { recursive: true })
    for (const skill of fs.readdirSync(skillsDir)) {
      const skillPath = path.join(skillsDir, skill)
      const destPath = path.join(STAGING_DIR, 'workspace/skills', skill)
      if (fs.statSync(skillPath).isDirectory()) {
        if (DRY_RUN) {
          console.log(`  📦 skills/${skill}`)
        } else {
          fs.cpSync(skillPath, destPath, { recursive: true })
          console.log(`✅ skills/${skill}`)
        }
      }
    }
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. No changes made.')
    return
  }

  // Write metadata
  fs.writeFileSync(
    path.join(STAGING_DIR, 'SYNC_METADATA.json'),
    JSON.stringify(
      {
        timestamp,
        tag: tagName,
        hostname: os.hostname(),
        platform: os.platform(),
        version: '2.1.0',
      },
      null,
      2,
    ),
  )

  // Git operations
  console.log('\n📤 Pushing to remote...')

  const repoUrl = repo.replace('https://', `https://${token}@`)

  try {
    process.chdir(STAGING_DIR)

    safeExec('git init', { stdio: 'ignore' })
    safeExec('git config user.email "sync@openclaw.local"', { stdio: 'ignore' })
    safeExec('git config user.name "Claw Sync"', { stdio: 'ignore' })
    safeExec('git add -A', { stdio: 'ignore' })

    const commitMsg = sanitizeForGit(`Sync: ${timestamp}`)
    safeExec(`git commit -m "${commitMsg}"`, { stdio: 'ignore' })

    // Push to main
    safeExec(`git push ${repoUrl} HEAD:main --force`, { stdio: 'pipe' })

    // Create version tag
    safeExec(`git tag ${tagName}`, { stdio: 'ignore' })
    safeExec(`git push ${repoUrl} ${tagName}`, { stdio: 'pipe' })

    console.log('\n✅ Sync complete!')
    console.log(`🏷️  Version: ${tagName}`)
    console.log(`🕐 ${timestamp}`)
    console.log(`📁 ${repo}`)
  } catch (err) {
    console.error('\n❌ Sync failed:', err.message)
    process.exit(1)
  } finally {
    // Cleanup
    process.chdir(os.homedir())
    if (fs.existsSync(STAGING_DIR)) {
      fs.rmSync(STAGING_DIR, { recursive: true })
    }
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
