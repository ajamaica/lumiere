#!/usr/bin/env node
/**
 * ClawPhone Install Script
 *
 * Adds ClawPhone heartbeat polling to user's HEARTBEAT.md
 * Run after installing the skill: node scripts/install.js
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const CLAWD_DIR = join(homedir(), 'clawd')
const HEARTBEAT_FILE = join(CLAWD_DIR, 'HEARTBEAT.md')

const CLAWDLINK_SECTION = `
## ClawPhone
- Poll for encrypted messages: \`node ~/clawd/skills/clawphone/heartbeat.js\`
- If output is non-empty, deliver it to the user
- Handles: messages, friend requests, acceptance notifications
`

function main() {
  console.log('🔗 ClawPhone Install')
  console.log('='.repeat(50))

  // Check if HEARTBEAT.md exists
  if (!existsSync(HEARTBEAT_FILE)) {
    console.log('⚠ HEARTBEAT.md not found at', HEARTBEAT_FILE)
    console.log('  Create it manually and add ClawPhone section.')
    console.log('')
    console.log('Add this to your HEARTBEAT.md:')
    console.log(CLAWDLINK_SECTION)
    return
  }

  // Check if already installed
  const content = readFileSync(HEARTBEAT_FILE, 'utf8')
  if (content.includes('ClawPhone') || content.includes('clawphone')) {
    console.log('✓ ClawPhone already in HEARTBEAT.md')
    return
  }

  // Append ClawPhone section
  appendFileSync(HEARTBEAT_FILE, CLAWDLINK_SECTION)
  console.log('✓ Added ClawPhone to HEARTBEAT.md')
  console.log('')
  console.log('ClawPhone will now poll for messages on each heartbeat.')
  console.log('')
  console.log("Next: Run setup if you haven't already:")
  console.log('  node cli.js setup "Your Name"')
}

main()
