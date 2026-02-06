#!/usr/bin/env node
/**
 * Claw Sync - Main Entry Point
 * Handles all slash commands: /sync, /restore, /sync-status, /sync-list
 *
 * Usage:
 *   node index.js sync [--dry-run]
 *   node index.js restore [latest|<version>] [--force]
 *   node index.js status
 *   node index.js list
 */

const { spawn } = require('child_process')
const path = require('path')

const SCRIPTS_DIR = path.join(__dirname, 'scripts')

// Parse command and args
const args = process.argv.slice(2)
const command = args[0]?.toLowerCase()
const commandArgs = args.slice(1)

// Help text
function showHelp() {
  console.log(`
🔄 Claw Sync - Commands

  /sync              Push memory and skills to remote
  /sync --dry-run    Preview what would be synced

  /restore           Restore latest version
  /restore <version> Restore specific version (e.g., backup-20260202-1430)
  /restore --force   Skip confirmation prompt

  /sync-status       Show sync configuration and local backups
  /sync-list         List all available backup versions

Examples:
  node index.js sync
  node index.js sync --dry-run
  node index.js restore
  node index.js restore backup-20260202-1430
  node index.js restore latest --force
  node index.js status
  node index.js list
`)
}

// Run a script
function runScript(scriptName, scriptArgs = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName)

  const child = spawn('node', [scriptPath, ...scriptArgs], {
    stdio: 'inherit',
    cwd: __dirname,
  })

  child.on('error', (err) => {
    console.error(`❌ Failed to run ${scriptName}:`, err.message)
    process.exit(1)
  })

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

// Main command handler
switch (command) {
  case 'sync':
  case 'push':
  case 'backup':
    // /sync or /backup
    runScript('push.js', commandArgs)
    break

  case 'restore':
  case 'pull':
    // /restore [version] [--force]
    const restoreArgs = []

    for (let i = 0; i < commandArgs.length; i++) {
      const arg = commandArgs[i]

      if (arg === '--force' || arg === '-f') {
        restoreArgs.push('--force')
      } else if (arg === 'latest') {
        // 'latest' means no version specified (default behavior)
        continue
      } else if (arg.startsWith('backup-')) {
        // Specific version
        restoreArgs.push('--version', arg)
      } else if (!arg.startsWith('-')) {
        // Assume it's a version tag
        restoreArgs.push('--version', arg)
      }
    }

    runScript('pull.js', restoreArgs)
    break

  case 'status':
  case 'sync-status':
    // /sync-status
    runScript('status.js')
    break

  case 'list':
  case 'sync-list':
  case 'versions':
    // /sync-list
    runScript('pull.js', ['--list'])
    break

  case 'setup':
  case 'cron':
    // Setup auto-sync
    runScript('setup-cron.js')
    break

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    showHelp()
    break

  default:
    console.error(`❌ Unknown command: ${command}`)
    console.log('Run with --help to see available commands.')
    process.exit(1)
}
