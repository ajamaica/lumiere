#!/usr/bin/env node
/**
 * Print .env lines for the Network funding page (EVM_PAYTO_<chainId>, EVM_RPC_*) from
 * multichain wallets in ~/.evm-wallets.json. Use after creating per-chain wallets with:
 *
 *   node src/setup-evm-multichain.js --force --unique --chains "ethereum,optimism,polygon,arbitrum,base"
 *
 * Then run this script and paste the output into your root .env. Optional: set --rpc to
 * include EVM_RPC_* lines (default: include). Use --json for machine-readable output.
 *
 * Usage: node src/print-network-funding-env.js [--no-rpc] [--json]
 * From repo root: cd autonomous && node src/print-network-funding-env.js
 */

import { chains, getChain } from './lib/chains.js'
import { loadAll } from './lib/wallet.js'

// Kraken-supported mainnet chains used by scripts/update_network_funding_cache.py
const FUNDING_CHAIN_NAMES = ['ethereum', 'optimism', 'polygon', 'arbitrum', 'base']

const args = process.argv.slice(2)
const noRpc = args.includes('--no-rpc')
const jsonOut = args.includes('--json')

function main() {
  const data = loadAll()
  const wallets = data?.wallets || []
  const byNetwork = new Map()
  let multichainAddress = null
  for (const w of wallets) {
    if (w.network === 'multichain') multichainAddress = w.address
    else if (w.network) byNetwork.set(w.network.toLowerCase(), w.address)
  }

  const out = {}
  const lines = []

  for (const name of FUNDING_CHAIN_NAMES) {
    const address = byNetwork.get(name) || multichainAddress
    if (!address) continue
    const chain = getChain(name)
    const chainId = String(chain.chainId)
    out[`EVM_PAYTO_${chainId}`] = address
    if (!jsonOut) lines.push(`EVM_PAYTO_${chainId}=${address}   # ${chain.name}`)
  }

  if (!noRpc && !jsonOut) {
    lines.push('')
    for (const name of FUNDING_CHAIN_NAMES) {
      const chain = chains[name]
      if (!chain?.rpcs?.[0]) continue
      const chainId = String(chain.chainId)
      lines.push(`# EVM_RPC_${chainId}=${chain.rpcs[0]}`)
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(out, null, 2))
    return
  }

  if (lines.length === 0) {
    console.error('No EVM wallets found for funding chains. Create per-chain wallets with:')
    console.error(
      '  node src/setup-evm-multichain.js --force --unique --chains "ethereum,optimism,polygon,arbitrum,base"',
    )
    console.error('Or one shared wallet: node src/setup-evm-multichain.js --force')
    process.exit(1)
  }

  console.log('# Paste into root .env for Network funding page (EVM_PAYTO_*)\n')
  console.log(lines.join('\n'))
  console.log('\n# Then run: python scripts/update_network_funding_cache.py')
}

main()
