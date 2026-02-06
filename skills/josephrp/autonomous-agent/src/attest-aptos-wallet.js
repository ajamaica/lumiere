#!/usr/bin/env node
/**
 * Aptos wallet attestation for CornerStone Agentic Score.
 * Signs an off-chain message to prove ownership of the given (or default) Aptos address.
 * Output: JSON with address, message, signature (hex), public_key_hex for submission to onboarding POST /attest/aptos.
 *
 * Usage:
 *   node src/attest-aptos-wallet.js
 *   node src/attest-aptos-wallet.js --address 0x...
 *   node src/attest-aptos-wallet.js --message "Custom message"
 *
 * Configuration (in order of precedence):
 *   - APTOS_PRIVATE_KEY_HEX or APTOS_PRIVATE_KEY  env: use this key (address derived from key)
 *   - Default: ~/.aptos-agent-wallets.json or ~/.aptos-agent-wallet.json
 *
 * For npm package (cornerstone-autonomous-agent): use from project root or npx.
 */

import { getWallet, getWalletAt, loadAll } from './lib/aptos/wallet.js'

const PREFIX =
  'CornerStone Agentic Score wallet attestation – I control the address(es) I am registering. Nonce: '

function toHex(str) {
  return '0x' + Buffer.from(str, 'utf8').toString('hex')
}

async function main() {
  const args = process.argv.slice(2)
  let addressArg = null
  let customMessage = null
  let privateKeyArg = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--address' && args[i + 1]) {
      addressArg = args[i + 1].trim()
      i++
    } else if (args[i] === '--message' && args[i + 1]) {
      customMessage = args[i + 1]
      i++
    } else if ((args[i] === '--private-key' || args[i] === '-k') && args[i + 1]) {
      privateKeyArg = args[i + 1].trim()
      i++
    }
  }

  let wallet = null
  const pkEnv = (process.env.APTOS_PRIVATE_KEY_HEX || process.env.APTOS_PRIVATE_KEY || '').trim()
  const pkRaw = privateKeyArg || pkEnv
  if (pkRaw) {
    const normalizedPk = pkRaw.replace(/^0x/, '')
    if (normalizedPk.length < 64) {
      console.error('Invalid APTOS_PRIVATE_KEY: expected 32 hex bytes (64 hex chars).')
      process.exit(1)
    }
    const { Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk')
    const privateKey = new Ed25519PrivateKey(
      normalizedPk.startsWith('0x') ? normalizedPk : '0x' + normalizedPk,
    )
    const account = Account.fromPrivateKey({ privateKey, legacy: false })
    const address = (process.env.APTOS_ADDRESS || '').trim() || account.accountAddress.toString()
    wallet = {
      address,
      privateKey: normalizedPk.startsWith('0x') ? normalizedPk : '0x' + normalizedPk,
    }
  }
  if (!wallet && (addressArg || !pkRaw)) {
    wallet = addressArg ? getWalletAt(addressArg) : getWallet()
  }
  if (!wallet) {
    if (addressArg) {
      console.error('No wallet found for address:', addressArg)
      console.error('List addresses with: node src/show-agent-addresses.js')
    } else {
      console.error('No Aptos wallet found. Set APTOS_PRIVATE_KEY_HEX or run: npm run setup:aptos')
    }
    process.exit(1)
  }

  const nonce = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  const message = customMessage || PREFIX + nonce
  const messageHex = toHex(message)

  try {
    const { Account, Ed25519PrivateKey } = await import('@aptos-labs/ts-sdk')
    const privateKey = new Ed25519PrivateKey(wallet.privateKey)
    const account = Account.fromPrivateKey({ privateKey, legacy: false })
    const signature = account.sign(messageHex)
    const sigHex = typeof signature.toHex === 'function' ? signature.toHex() : signature.toString()
    const pubKey = account.publicKey
    const public_key_hex =
      pubKey && (typeof pubKey.toHex === 'function' ? pubKey.toHex() : String(pubKey))

    const out = {
      address: wallet.address,
      message,
      signature: sigHex,
      public_key_hex: public_key_hex || undefined,
    }
    console.log(JSON.stringify(out, null, 2))
    console.error(
      '\nSubmit this to onboarding POST /attest/aptos (e.g. paste into flow or use API).',
    )
  } catch (e) {
    console.error('Signing failed:', e.message)
    process.exit(1)
  }
}

main()
