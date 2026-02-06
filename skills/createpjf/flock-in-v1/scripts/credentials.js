#!/usr/bin/env node
/**
 * Manage FLock credentials
 * Usage:
 *   node credentials.js save <api_key> [wallet_address] [private_key]
 *   node credentials.js get
 *   node credentials.js path
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

function getCredentialsPath() {
  // Priority: OpenClaw directory > local
  const openclawDir = path.join(os.homedir(), '.openclaw')
  if (fs.existsSync(openclawDir)) {
    return path.join(openclawDir, 'flock-credentials.json')
  }
  return path.join(process.cwd(), 'flock-credentials.json')
}

function loadCredentials() {
  const credPath = getCredentialsPath()
  if (!fs.existsSync(credPath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(credPath, 'utf8'))
}

function saveCredentials(data) {
  const credPath = getCredentialsPath()
  const dir = path.dirname(credPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Merge with existing
  let existing = {}
  if (fs.existsSync(credPath)) {
    existing = JSON.parse(fs.readFileSync(credPath, 'utf8'))
  }

  const merged = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }

  if (!merged.createdAt) {
    merged.createdAt = merged.updatedAt
  }

  fs.writeFileSync(credPath, JSON.stringify(merged, null, 2), { mode: 0o600 })
  return credPath
}

async function main() {
  const command = process.argv[2]

  switch (command) {
    case 'save': {
      const apiKey = process.argv[3]
      const walletAddress = process.argv[4]
      const privateKey = process.argv[5]

      if (!apiKey) {
        console.error('Usage: node credentials.js save <api_key> [wallet_address] [private_key]')
        process.exit(1)
      }

      const data = { apiKey }
      if (walletAddress) data.walletAddress = walletAddress
      if (privateKey) data.privateKey = privateKey

      const savedPath = saveCredentials(data)
      console.log(`Credentials saved to: ${savedPath}`)
      break
    }

    case 'get': {
      const creds = loadCredentials()
      if (!creds) {
        console.log('No credentials found')
        process.exit(1)
      }
      console.log(JSON.stringify(creds, null, 2))
      break
    }

    case 'path': {
      console.log(getCredentialsPath())
      break
    }

    default:
      console.log('FLock Credentials Manager')
      console.log('')
      console.log('Commands:')
      console.log('  save <api_key> [wallet] [pk]  Save credentials')
      console.log('  get                           Get saved credentials')
      console.log('  path                          Show credentials file path')
  }
}

main().catch(console.error)
