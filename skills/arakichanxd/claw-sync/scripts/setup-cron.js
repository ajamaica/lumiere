#!/usr/bin/env node
/**
 * Setup auto-backup cron job
 * Runs backup every 12 hours
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const OPENCLAW_DIR = path.join(require('os').homedir(), '.openclaw')
const WORKSPACE_DIR = path.join(OPENCLAW_DIR, 'workspace')
const SKILL_DIR = path.join(WORKSPACE_DIR, 'skills/claw-sync')

async function main() {
  console.log('🔧 Setting up auto-backup cron job...\n')

  // Check if skill exists
  if (!fs.existsSync(SKILL_DIR)) {
    console.error('❌ Backup skill not found at:', SKILL_DIR)
    process.exit(1)
  }

  // Create the cron job payload
  const job = {
    name: 'claw-sync',
    schedule: {
      kind: 'every',
      everyMs: 12 * 60 * 60 * 1000, // 12 hours
    },
    payload: {
      kind: 'agentTurn',
      message: 'exec: node skills/claw-sync/scripts/push.js',
      timeoutSeconds: 300,
    },
    sessionTarget: 'isolated',
    enabled: true,
  }

  console.log('Creating cron job...')
  console.log('  Name: claw-sync')
  console.log('  Schedule: Every 12 hours')
  console.log('  Command: node skills/claw-sync/scripts/push.js')
  console.log('')

  // Use the cron tool via gateway
  try {
    // We'll output the config for manual addition or use a direct approach
    const cronConfigPath = path.join(OPENCLAW_DIR, 'cron', 'backup.json')

    // Ensure cron directory exists
    fs.mkdirSync(path.join(OPENCLAW_DIR, 'cron'), { recursive: true })

    // Write job config
    fs.writeFileSync(cronConfigPath, JSON.stringify(job, null, 2))

    console.log('✅ Cron config saved to:', cronConfigPath)
    console.log('')
    console.log('To activate via OpenClaw CLI:')
    console.log(`  openclaw cron add ${cronConfigPath}`)
    console.log('')
    console.log('Or add manually to your crontab:')
    console.log(
      `  0 */12 * * * cd ${WORKSPACE_DIR} && node skills/claw-sync/scripts/push.js >> /tmp/claw-sync.log 2>&1`,
    )
  } catch (err) {
    console.error('❌ Setup failed:', err.message)
    process.exit(1)
  }
}

main().catch(console.error)
