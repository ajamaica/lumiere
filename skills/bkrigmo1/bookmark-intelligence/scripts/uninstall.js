#!/usr/bin/env node
/**
 * Bookmark Intelligence Uninstall Script
 * Clean removal with option to preserve analyzed bookmarks
 */

import { execSync } from 'child_process'
import { existsSync, rmSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

const { green, yellow, red, cyan, bright, reset } = colors

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

function print(message, color = reset) {
  console.log(`${color}${message}${reset}`)
}

function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('')
  print('🗑️  Bookmark Intelligence - Uninstall', bright)
  console.log('='.repeat(60))
  console.log('')

  print('This will remove:', yellow)
  print('  • PM2 daemon (if running)', yellow)
  print('  • Credentials (.env file)', yellow)
  print('  • Configuration (config.json)', yellow)
  print('  • Processing state (bookmarks.json)', yellow)
  console.log('')

  const keepData = await ask(
    `${cyan}Keep analyzed bookmarks in life/resources/bookmarks/? (Y/n):${reset} `,
  )
  const shouldKeepData = keepData.toLowerCase() !== 'n'

  console.log('')
  const confirm = await ask(`${red}${bright}Are you sure you want to uninstall? (y/N):${reset} `)

  if (confirm.toLowerCase() !== 'y') {
    print('\nUninstall cancelled.', green)
    rl.close()
    return
  }

  console.log('')
  print('Uninstalling...', yellow)
  console.log('')

  let removed = 0

  // 1. Stop PM2 daemon
  if (commandExists('pm2')) {
    try {
      print('🛑 Stopping PM2 daemon...', cyan)
      execSync('pm2 delete bookmark-intelligence 2>/dev/null', { stdio: 'ignore' })
      print('   ✅ PM2 daemon stopped and removed', green)
      removed++
    } catch {
      print('   ℹ️  No PM2 daemon was running', yellow)
    }
  }

  // 2. Remove credentials
  const envFile = join(SKILL_DIR, '.env')
  if (existsSync(envFile)) {
    unlinkSync(envFile)
    print('🔐 Removed credentials (.env)', green)
    removed++
  }

  // 3. Remove config
  const configFile = join(SKILL_DIR, 'config.json')
  if (existsSync(configFile)) {
    unlinkSync(configFile)
    print('⚙️  Removed configuration (config.json)', green)
    removed++
  }

  // 4. Remove state
  const stateFile = join(SKILL_DIR, 'bookmarks.json')
  if (existsSync(stateFile)) {
    unlinkSync(stateFile)
    print('📊 Removed processing state (bookmarks.json)', green)
    removed++
  }

  // 5. Remove analyzed bookmarks (optional)
  if (!shouldKeepData) {
    const storageDir = join(SKILL_DIR, '../../life/resources/bookmarks')
    if (existsSync(storageDir)) {
      try {
        rmSync(storageDir, { recursive: true, force: true })
        print('📚 Removed analyzed bookmarks', green)
        removed++
      } catch (error) {
        print(`❌ Failed to remove bookmarks: ${error.message}`, red)
      }
    }
  } else {
    print('📚 Keeping analyzed bookmarks (as requested)', cyan)
  }

  console.log('')

  if (removed > 0) {
    print(`✅ Uninstall complete! Removed ${removed} item(s).`, green)
  } else {
    print('ℹ️  Nothing to remove (already clean)', yellow)
  }

  console.log('')
  print('To reinstall, run:', cyan)
  print('  npm run setup', bright)
  console.log('')

  rl.close()
}

process.on('SIGINT', () => {
  print('\n\nUninstall cancelled.', yellow)
  rl.close()
  process.exit(0)
})

main().catch((error) => {
  print(`\n❌ Uninstall failed: ${error.message}`, red)
  rl.close()
  process.exit(1)
})
