#!/usr/bin/env node

/**
 * Setup Script - Generate new wallet
 * Creates a new wallet and saves it securely to state/wallet.json
 */

import { homedir } from 'os'
import { join } from 'path'

import { exists, generate, getWalletInfo, save } from './lib/wallet.js'

// Parse command line arguments
const args = process.argv.slice(2)
const forceFlag = args.includes('--force')
const jsonFlag = args.includes('--json')
const helpFlag = args.includes('--help') || args.includes('-h')

function showHelp() {
  console.log(`
EVM Wallet Setup

Usage: node src/setup.js [options]

Options:
  --force    Overwrite existing wallet
  --json     Output in JSON format
  --help     Show this help message

Examples:
  node src/setup.js           # Generate new wallet
  node src/setup.js --force   # Overwrite existing wallet
`)
}

function exitWithError(message, code = 1) {
  if (jsonFlag) {
    console.log(JSON.stringify({ success: false, error: message }))
  } else {
    console.error(`Error: ${message}`)
  }
  process.exit(code)
}

async function main() {
  try {
    if (helpFlag) {
      showHelp()
      return
    }

    // Check if wallet already exists
    if (exists() && !forceFlag) {
      const info = getWalletInfo()
      if (jsonFlag) {
        console.log(
          JSON.stringify({
            success: false,
            error: 'Wallet already exists',
            existing_wallet: info,
          }),
        )
      } else {
        console.log('❌ Wallet already exists!')
        console.log(`Address: ${info.address}`)
        console.log(`Created: ${info.createdAt}`)
        console.log('\nUse --force to overwrite or check existing wallet first.')
      }
      process.exit(1)
    }

    // Generate new wallet
    if (!jsonFlag) {
      console.log('🔐 Generating new wallet...')
    }

    const wallet = generate()
    save(wallet)

    if (jsonFlag) {
      console.log(
        JSON.stringify({
          success: true,
          address: wallet.address,
          created_at: wallet.createdAt,
        }),
      )
    } else {
      console.log('✅ Wallet created successfully!')
      console.log(`\nAddress: ${wallet.address}`)
      console.log(`Created: ${wallet.createdAt}`)
      console.log(`\nWallet saved to: ${join(homedir(), '.evm-wallet.json')}`)
      console.log('🔒 Private key stored securely (chmod 600)')
      console.log('\n⚠️  IMPORTANT: Back up your wallet file! If lost, funds cannot be recovered.')

      console.log('\nNext steps:')
      console.log('1. Fund your wallet by sending ETH to the address above')
      console.log('2. Check balance: node src/balance.js base')
      console.log('3. Start with small amounts on Base (lowest gas fees)')
    }
  } catch (error) {
    exitWithError(error.message)
  }
}

main().catch((error) => {
  exitWithError(`Unexpected error: ${error.message}`)
})
