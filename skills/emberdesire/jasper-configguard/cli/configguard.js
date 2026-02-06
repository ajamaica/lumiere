#!/usr/bin/env node

/**
 * jasper-configguard — Safe OpenClaw config changes with automatic rollback
 *
 * Usage:
 *   jasper-configguard patch '{"gateway":{"controlUi":{"enabled":true}}}'
 *   jasper-configguard patch --file patch.json
 *   jasper-configguard restore [backup-id]
 *   jasper-configguard list
 *   jasper-configguard diff [backup-id]
 *   jasper-configguard validate [config-path]
 *   jasper-configguard setup
 *   jasper-configguard --version
 */

const { ConfigGuard } = require('../src/index.js')
const fs = require('fs')
const path = require('path')

const VERSION = require('../package.json').version

const HELP = `
🛡️  jasper-configguard v${VERSION}
Safe config changes for OpenClaw with automatic rollback.

USAGE:
  jasper-configguard <command> [options]

COMMANDS:
  patch <json|--file path>   Apply a config patch with safety net
  restore [id]               Restore a backup (latest if no id)
  list                       List available backups
  diff [id]                  Show diff between current and backup
  validate [path]            Validate a config file
  setup                      Initialize backup directory
  doctor                     Check gateway health + config validity

OPTIONS:
  --config <path>     Path to openclaw.json (auto-detected)
  --timeout <secs>    Health check timeout (default: 30)
  --dry-run           Show what would change without applying
  --no-restart        Apply config without restarting gateway
  --verbose           Show detailed output
  --version           Show version
  --help              Show this help

EXAMPLES:
  # Apply a config change safely
  jasper-configguard patch '{"gateway":{"bind":"lan"}}'

  # Preview changes without applying
  jasper-configguard patch --dry-run '{"agents":{"defaults":{"model":{"primary":"anthropic/claude-sonnet-4-5"}}}}'

  # Restore last known good config
  jasper-configguard restore

  # Show what changed since last backup
  jasper-configguard diff
`

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    return
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP)
    return
  }

  const command = args[0]
  const flags = parseFlags(args.slice(1))
  const guard = new ConfigGuard({
    configPath: flags.config,
    timeout: parseInt(flags.timeout || '30', 10),
    verbose: flags.verbose || false,
  })

  try {
    switch (command) {
      case 'patch':
        await handlePatch(guard, args.slice(1), flags)
        break
      case 'restore':
        await handleRestore(guard, args[1], flags)
        break
      case 'list':
        await handleList(guard)
        break
      case 'diff':
        await handleDiff(guard, args[1])
        break
      case 'validate':
        await handleValidate(guard, args[1])
        break
      case 'setup':
        await handleSetup(guard)
        break
      case 'doctor':
        await handleDoctor(guard)
        break
      default:
        // Maybe it's inline JSON
        if (command.startsWith('{')) {
          await handlePatch(guard, args, flags)
        } else {
          console.error(`Unknown command: ${command}\nRun 'jasper-configguard --help' for usage.`)
          process.exit(1)
        }
    }
  } catch (err) {
    console.error(`\n❌ ${err.message}`)
    if (flags.verbose) console.error(err.stack)
    process.exit(1)
  }
}

function parseFlags(args) {
  const flags = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      flags.config = args[++i]
    } else if (args[i] === '--timeout' && args[i + 1]) {
      flags.timeout = args[++i]
    } else if (args[i] === '--file' && args[i + 1]) {
      flags.file = args[++i]
    } else if (args[i] === '--dry-run') {
      flags.dryRun = true
    } else if (args[i] === '--no-restart') {
      flags.noRestart = true
    } else if (args[i] === '--verbose') {
      flags.verbose = true
    }
  }
  return flags
}

async function handlePatch(guard, args, flags) {
  let patch

  if (flags.file) {
    const filePath = path.resolve(flags.file)
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)
    patch = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } else {
    // Find the JSON argument
    const jsonArg = args.find((a) => a.startsWith('{') || a.startsWith('"'))
    if (!jsonArg)
      throw new Error('No JSON patch provided. Use: patch \'{"key":"value"}\' or --file path.json')
    patch = JSON.parse(jsonArg)
  }

  if (flags.dryRun) {
    const result = await guard.dryRun(patch)
    console.log('\n🔍 Dry run — changes that would be applied:\n')
    console.log(result.diff)
    console.log('\nNo changes made. Remove --dry-run to apply.')
    return
  }

  const result = await guard.patch(patch, {
    restart: !flags.noRestart,
    verbose: flags.verbose,
  })

  if (result.success) {
    console.log(`\n✅ Config updated successfully`)
    console.log(`   Backup: ${result.backupId}`)
    console.log(`   Rollback: jasper-configguard restore ${result.backupId}`)
  } else {
    console.log(`\n⚠️  Config rolled back — gateway failed health check`)
    console.log(`   Error: ${result.error}`)
    process.exit(1)
  }
}

async function handleRestore(guard, backupId) {
  const result = await guard.restore(backupId)
  if (result.success) {
    console.log(`\n✅ Restored from backup: ${result.backupId}`)
    console.log(`   Gateway health: ${result.healthy ? 'healthy' : 'check manually'}`)
  } else {
    console.error(`\n❌ Restore failed: ${result.error}`)
    process.exit(1)
  }
}

async function handleList(guard) {
  const backups = guard.listBackups()
  if (backups.length === 0) {
    console.log('\nNo backups found. Run a patch to create one.')
    return
  }
  console.log(`\n📦 Config backups (${backups.length}):\n`)
  for (const b of backups) {
    const age = timeSince(b.timestamp)
    console.log(`  ${b.id}  ${b.date}  (${age} ago)  ${b.size}`)
  }
  console.log(`\nRestore: jasper-configguard restore <id>`)
}

async function handleDiff(guard, backupId) {
  const diff = guard.diff(backupId)
  if (!diff) {
    console.log('\nNo differences found (or no backup to compare).')
    return
  }
  console.log('\n📋 Config diff:\n')
  console.log(diff)
}

async function handleValidate(guard, configPath) {
  const result = guard.validate(configPath)
  if (result.valid) {
    console.log('\n✅ Config is valid JSON')
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach((w) => console.log(`   - ${w}`))
    }
  } else {
    console.error(`\n❌ Invalid config: ${result.error}`)
    process.exit(1)
  }
}

async function handleSetup(guard) {
  guard.setup()
  console.log('\n✅ ConfigGuard initialized')
  console.log(`   Config: ${guard.configPath}`)
  console.log(`   Backups: ${guard.backupDir}`)
  console.log(`   Max backups: ${guard.maxBackups}`)
}

async function handleDoctor(guard) {
  console.log('\n🏥 ConfigGuard Doctor\n')

  // Check config exists
  const configExists = fs.existsSync(guard.configPath)
  console.log(`  Config file: ${configExists ? '✅' : '❌'} ${guard.configPath}`)

  // Validate JSON
  if (configExists) {
    const result = guard.validate()
    console.log(`  Valid JSON: ${result.valid ? '✅' : '❌'}`)
  }

  // Check backups
  const backups = guard.listBackups()
  console.log(`  Backups: ${backups.length > 0 ? '✅' : '⚠️ '} ${backups.length} available`)

  // Check gateway health
  const healthy = await guard.healthCheck()
  console.log(`  Gateway: ${healthy ? '✅ healthy' : '❌ not responding'}`)

  // Check gateway process
  const running = guard.isGatewayRunning()
  console.log(`  Process: ${running ? '✅ running' : '❌ not found'}`)
}

function timeSince(timestamp) {
  // timestamp is unix seconds, Date.now() is ms
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`)
  process.exit(1)
})
