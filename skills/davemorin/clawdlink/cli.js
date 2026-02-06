#!/usr/bin/env node
/**
 * ClawPhone CLI
 * Encrypted Clawdbot-to-Clawdbot messaging via relay
 */

import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(homedir(), '.clawdbot', 'clawphone')
const IDENTITY_FILE = join(DATA_DIR, 'identity.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')
const FRIENDS_FILE = join(DATA_DIR, 'friends.json')

const args = process.argv.slice(2)
const command = args[0]

async function main() {
  switch (command) {
    case 'setup':
      const name = args[1] || 'ClawPhone User'
      execSync(`node ${join(__dirname, 'scripts/setup.js')} --name="${name}"`, { stdio: 'inherit' })
      break

    case 'link':
      // Show friend link
      if (!existsSync(IDENTITY_FILE)) {
        console.log('Not set up yet. Run: clawphone setup "Your Name"')
        process.exit(1)
      }
      const identity = JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'))
      const config = existsSync(CONFIG_FILE)
        ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
        : { displayName: 'ClawPhone User' }

      const params = new URLSearchParams({
        key: `ed25519:${identity.publicKey}`,
        name: config.displayName,
      })
      console.log(`clawphone://relay.clawphone.bot/add?${params.toString()}`)
      break

    case 'add':
      // Add friend
      if (!args[1]) {
        console.log('Usage: clawphone add <friend-link>')
        process.exit(1)
      }
      execSync(`node ${join(__dirname, 'scripts/friends.js')} add "${args[1]}"`, {
        stdio: 'inherit',
      })
      break

    case 'friends':
      // List friends
      execSync(`node ${join(__dirname, 'scripts/friends.js')} list`, { stdio: 'inherit' })
      break

    case 'send':
      // Send message
      if (!args[1] || !args[2]) {
        console.log('Usage: clawphone send <friend> <message>')
        process.exit(1)
      }
      const friend = args[1]
      const message = args.slice(2).join(' ')
      execSync(`node ${join(__dirname, 'scripts/send.js')} "${friend}" "${message}"`, {
        stdio: 'inherit',
      })
      break

    case 'poll':
      // Check for messages
      const pollArgs = args.slice(1).join(' ')
      execSync(`node ${join(__dirname, 'scripts/poll.js')} ${pollArgs}`, { stdio: 'inherit' })
      break

    case 'inbox':
      // Alias for poll
      execSync(`node ${join(__dirname, 'scripts/poll.js')}`, { stdio: 'inherit' })
      break

    case 'status':
      // Check relay and local status
      console.log('🔗 ClawPhone Status')
      console.log('='.repeat(50))

      if (!existsSync(IDENTITY_FILE)) {
        console.log('Status: Not configured')
        console.log('Run: clawphone setup "Your Name"')
        break
      }

      const id = JSON.parse(readFileSync(IDENTITY_FILE, 'utf8'))
      const cfg = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : {}
      const friendsData = existsSync(FRIENDS_FILE)
        ? JSON.parse(readFileSync(FRIENDS_FILE, 'utf8'))
        : { friends: [] }

      console.log(`Identity: ${cfg.displayName || 'Unknown'}`)
      console.log(`Public Key: ${id.publicKey.slice(0, 24)}...`)
      console.log(`Friends: ${friendsData.friends.length}`)
      console.log('')

      // Check relay health
      try {
        const response = await fetch('https://clawphone-relay.vercel.app/health')
        const health = await response.json()
        console.log(`Relay: ✓ Online (${health.version})`)
      } catch (err) {
        console.log('Relay: ✗ Offline or unreachable')
      }
      break

    default:
      console.log(`
🔗 ClawPhone - Encrypted Clawdbot-to-Clawdbot Messaging

Commands:
  setup [name]          Initialize ClawPhone with your name
  link                  Show your friend link
  add <link>            Add a friend from their link
  friends               List your friends
  send <friend> <msg>   Send a message
  poll                  Check for new messages
  inbox                 Alias for poll
  status                Check ClawPhone and relay status

Examples:
  clawphone setup "Dave Morin"
  clawphone link
  clawphone add "clawphone://relay.clawphone.bot/add?key=..."
  clawphone send "Matt" "Hey, let's jam on AI agents!"
  clawphone poll
`)
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
