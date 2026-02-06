#!/usr/bin/env node
/**
 * EVM wallet attestation for CornerStone Agentic Score.
 * Signs an EIP-191 message to prove ownership of the given (or default) EVM address.
 * Output: JSON with address, message, signature for submission to onboarding POST /attest/evm
 * (e.g. paste into flow or use API).
 *
 * Usage:
 *   node src/attest-evm-wallet.js
 *   node src/attest-evm-wallet.js --address 0x...
 *   node src/attest-evm-wallet.js --message "Custom message"
 *
 * Configuration (in order of precedence):
 *   - EVM_PRIVATE_KEY  env: use this key (address derived from key)
 *   - EVM_WALLET_PATH  env: path to wallet file (~/.evm-wallet.json or .evm-wallets.json)
 *   - Default: ~/.evm-wallets.json or ~/.evm-wallet.json
 *
 * For npm package (cornerstone-autonomous-agent): use from project root or npx.
 */

import { getAccount } from './lib/wallet.js'

const PREFIX =
  'CornerStone Agentic Score wallet attestation – I control the address(es) I am registering. Nonce: '

async function main() {
  const args = process.argv.slice(2)
  let addressArg = null
  let customMessage = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--address' && args[i + 1]) {
      addressArg = args[i + 1].trim()
      i++
    } else if (args[i] === '--message' && args[i + 1]) {
      customMessage = args[i + 1]
      i++
    }
  }

  let account
  try {
    account = addressArg ? getAccount(addressArg) : getAccount()
  } catch (e) {
    if (addressArg) {
      console.error('No wallet found for address:', addressArg)
      console.error('List addresses with: node src/show-agent-addresses.js')
    } else {
      console.error('No EVM wallet found. Set EVM_PRIVATE_KEY or run setup.js')
    }
    process.exit(1)
  }

  const nonce = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  const message = customMessage || PREFIX + nonce

  try {
    const signature = await account.signMessage({ message })
    const out = {
      address: account.address,
      message,
      signature: typeof signature === 'string' ? signature : (signature || '').toString(),
    }
    console.log(JSON.stringify(out, null, 2))
    console.error('\nSubmit this to onboarding POST /attest/evm (e.g. paste into flow or use API).')
  } catch (e) {
    console.error('Signing failed:', e.message)
    process.exit(1)
  }
}

main()
