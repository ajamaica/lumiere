#!/usr/bin/env node
/**
 * Generate Aptos wallet and save to ~/.aptos-agent-wallet.json (chmod 600).
 * Usage: node src/setup-aptos.js [--force] [--json]
 */

import { homedir } from 'os'
import { join } from 'path'

import { exists, getWalletInfo, save } from './lib/aptos/wallet.js'

const args = process.argv.slice(2)
const force = args.includes('--force')
const json = args.includes('--json')

async function main() {
  try {
    const { Account } = await import('@aptos-labs/ts-sdk')
    const account = Account.generate()
    const wallet = {
      address: account.accountAddress.toString(),
      privateKey: account.privateKey.toString(),
      createdAt: new Date().toISOString(),
    }

    if (exists() && !force) {
      const info = getWalletInfo()
      if (json) {
        console.log(
          JSON.stringify({ success: false, error: 'Wallet already exists', existing_wallet: info }),
        )
      } else {
        console.log('Aptos wallet already exists:', info?.address)
        console.log('Use --force to overwrite.')
      }
      process.exit(1)
    }

    save(wallet)
    if (json) {
      console.log(
        JSON.stringify({ success: true, address: wallet.address, created_at: wallet.createdAt }),
      )
    } else {
      console.log('Aptos wallet created.')
      console.log('Address:', wallet.address)
      console.log('Saved to:', join(homedir(), '.aptos-agent-wallet.json'))
      console.log('Fund with testnet APT/USDC (see IMPLEMENTATION_PLAN §15.1).')
    }
  } catch (e) {
    if (
      e.code === 'ERR_MODULE_NOT_FOUND' ||
      (e.message && e.message.includes('@aptos-labs/ts-sdk'))
    ) {
      if (json)
        console.log(
          JSON.stringify({
            success: false,
            error: 'Install @aptos-labs/ts-sdk: npm install @aptos-labs/ts-sdk',
          }),
        )
      else console.error('Install Aptos SDK first: npm install @aptos-labs/ts-sdk')
    } else {
      if (json) console.log(JSON.stringify({ success: false, error: e.message }))
      else console.error(e.message)
    }
    process.exit(1)
  }
}

main()
