#!/usr/bin/env node
/**
 * Check ETH balance on Ethereum and Base
 * Usage: node check-balance.js <address>
 */

const { JsonRpcProvider, formatEther } = require('ethers')

const CHAINS = [
  { name: 'Ethereum', rpc: 'https://eth.llamarpc.com', chainId: 1 },
  { name: 'Base', rpc: 'https://mainnet.base.org', chainId: 8453 },
]

async function checkBalances(address) {
  const results = []

  for (const chain of CHAINS) {
    try {
      const provider = new JsonRpcProvider(chain.rpc)
      const balance = await provider.getBalance(address)
      results.push({
        chain: chain.name,
        chainId: chain.chainId,
        balance: formatEther(balance),
        hasFunds: balance > 0n,
      })
    } catch (e) {
      results.push({
        chain: chain.name,
        chainId: chain.chainId,
        error: e.message,
      })
    }
  }

  return results
}

async function main() {
  const address = process.argv[2]

  if (!address) {
    console.error('Usage: node check-balance.js <address>')
    process.exit(1)
  }

  const balances = await checkBalances(address)
  console.log(JSON.stringify(balances, null, 2))

  const funded = balances.find((b) => b.hasFunds)
  if (funded) {
    console.log(`\nFunds detected on ${funded.chain}: ${funded.balance} ETH`)
  } else {
    console.log('\nNo funds detected on any chain')
  }
}

main().catch(console.error)
