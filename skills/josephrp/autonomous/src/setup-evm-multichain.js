#!/usr/bin/env node
/**
 * EVM multi-chain wallet setup.
 *
 * Important note (EVM reality):
 * - An EVM private key + address is valid on *all* EVM chains.
 * - You do NOT need a different key “per chain” to use the wallet on that chain.
 * - “Native wallet for a chain” usually means: fund the address with that chain’s native token.
 *
 * This script supports two modes:
 * - Default (shared): creates ONE wallet usable on every chain (recommended).
 * - --unique: creates one wallet per chain label (for isolation/bookkeeping).
 *
 * Wallet storage uses the existing multi-wallet file (`~/.evm-wallets.json`) via `lib/wallet.js`.
 *
 * Usage:
 *   node src/setup-evm-multichain.js
 *   node src/setup-evm-multichain.js --unique --chains "ethereum,base,polygon,arbitrum,optimism"
 *   node src/setup-evm-multichain.js --unique --chains "eip155:1,eip155:8453"
 *   node src/setup-evm-multichain.js --force
 *   node src/setup-evm-multichain.js --json
 */

import { getChain, getSupportedChains } from './lib/chains.js'
import { generate, getAllWalletInfos, loadAll, save } from './lib/wallet.js'

const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const forceFlag = args.includes('--force')
const uniqueFlag = args.includes('--unique')

function parseArgValue(flag) {
  const i = args.indexOf(flag)
  if (i < 0) return null
  return args[i + 1] || null
}

function out(obj) {
  if (jsonFlag) {
    console.log(JSON.stringify(obj, null, 2))
    return
  }
  if (obj?.message) console.log(obj.message)
  if (obj?.address) {
    console.log('\nAddress:', obj.address)
    if (obj?.privateKey)
      console.log(
        'Private key (save securely, add to .env as EVM_PRIVATE_KEY or per-chain):\n' +
          obj.privateKey,
      )
  }
  if (Array.isArray(obj?.created) && obj.created.length) {
    console.log(
      '\n--- Copy these into your root .env (addresses for funding page, keys for signing/facilitator) ---\n',
    )
    for (const w of obj.created) {
      const chainId = (() => {
        try {
          return getChain(w.chain).chainId
        } catch {
          return ''
        }
      })()
      if (chainId) {
        console.log(`# ${w.chain} (chainId ${chainId})`)
        console.log(`EVM_PAYTO_${chainId}=${w.address}`)
        if (w.privateKey) console.log(`EVM_PRIVATE_KEY_${chainId}=${w.privateKey}`)
        console.log('')
      } else {
        console.log(`# ${w.chain}: ${w.address}`)
        if (w.privateKey) console.log(`Private key: ${w.privateKey}\n`)
      }
    }
    console.log('--- End .env snippet ---')
    console.log(
      '\nBack up the private keys securely. Paste EVM_PAYTO_* into .env for the Network funding page.',
    )
  }
  if (obj?.error && !obj?.message) console.error(obj.error)
}

function normalizeChainToken(token) {
  const t = (token || '').toString().trim()
  return t
}

function chainNameFromToken(token) {
  const t = normalizeChainToken(token)
  if (!t) return null

  // Accept chain names (base, polygon, etc.)
  const supported = getSupportedChains()
  const match = supported.find((c) => c.toLowerCase() === t.toLowerCase())
  if (match) return match

  // Accept `eip155:<chainId>` tokens: map by chainId if we have a config entry
  const m = /^eip155:(\d+)$/i.exec(t)
  if (m) {
    const id = Number(m[1])
    const byId = supported.find((c) => {
      try {
        return getChain(c).chainId === id
      } catch {
        return false
      }
    })
    return byId || null
  }

  return null
}

async function main() {
  const existing = loadAll()
  if (existing.wallets?.length && !forceFlag) {
    return out({
      success: false,
      message:
        'EVM wallet(s) already exist. Use --force to add more. Existing addresses:\n' +
        getAllWalletInfos()
          .map((w) => `- ${w.address}${w.network ? ` (${w.network})` : ''}`)
          .join('\n'),
      addresses: getAllWalletInfos(),
    })
  }

  if (!uniqueFlag) {
    const wallet = generate()
    wallet.network = 'multichain'
    save(wallet)
    return out({
      success: true,
      mode: 'shared',
      message:
        'Created ONE EVM wallet (multichain). This same address works on all EVM networks; fund it on each chain as needed.',
      address: wallet.address,
      privateKey: wallet.privateKey,
      network: wallet.network,
    })
  }

  const chainsArg = parseArgValue('--chains')
  const tokens = (chainsArg ? chainsArg.split(',') : getSupportedChains())
    .map((s) => s.trim())
    .filter(Boolean)
  const chainNames = []
  const unknown = []
  for (const tok of tokens) {
    const name = chainNameFromToken(tok)
    if (!name) unknown.push(tok)
    else chainNames.push(name)
  }

  if (unknown.length) {
    return out({
      success: false,
      error:
        `Unknown chain(s): ${unknown.join(', ')}. ` +
        `Supported chain names: ${getSupportedChains().join(', ')}. ` +
        'To add more chains, extend src/lib/chains.js first.',
    })
  }

  const created = []
  for (const chainName of chainNames) {
    const w = generate()
    // Tag as the chain name. `getWalletClient(chainName)` will now prefer wallets with matching tag.
    w.network = chainName
    // Don't change default wallet when adding multiple.
    save(w, { setDefault: false })
    created.push({
      chain: chainName,
      address: w.address,
      privateKey: w.privateKey,
      network: w.network,
    })
  }

  return out({
    success: true,
    mode: 'unique',
    created,
    message:
      'Created one EVM wallet per chain label. Note: this is optional; a single EVM wallet works on all chains.',
  })
}

main().catch((e) => {
  out({ success: false, error: e?.message || String(e) })
  process.exit(1)
})
