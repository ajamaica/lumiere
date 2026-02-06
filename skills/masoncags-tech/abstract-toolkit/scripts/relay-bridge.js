#!/usr/bin/env node
/**
 * Bridge ETH to Abstract using Relay
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node relay-bridge.js --from <chain> --amount <eth>
 *
 * Example:
 *   node relay-bridge.js --from base --amount 0.01
 *
 * Supported source chains: ethereum, base, arbitrum, optimism
 */

const { ethers } = require('ethers')

// Chain configs
const CHAINS = {
  ethereum: {
    chainId: 1,
    rpc: 'https://eth.llamarpc.com',
    relayDepositor: '0xa5f565650890fba1824ee0f21ebbbf660a179934',
  },
  base: {
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    relayDepositor: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
  },
  arbitrum: {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    relayDepositor: '0xa5f565650890fba1824ee0f21ebbbf660a179934',
  },
  optimism: {
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    relayDepositor: '0xa5f565650890fba1824ee0f21ebbbf660a179934',
  },
}

const ABSTRACT_CHAIN_ID = 2741

async function main() {
  const args = process.argv.slice(2)

  // Parse args
  let fromChain = 'base'
  let amount = '0.01'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      fromChain = args[i + 1].toLowerCase()
      i++
    } else if (args[i] === '--amount' && args[i + 1]) {
      amount = args[i + 1]
      i++
    }
  }

  if (!CHAINS[fromChain]) {
    console.error(`Unsupported chain: ${fromChain}`)
    console.log(`Supported: ${Object.keys(CHAINS).join(', ')}`)
    process.exit(1)
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY environment variable not set')
    process.exit(1)
  }

  const chain = CHAINS[fromChain]
  const provider = new ethers.JsonRpcProvider(chain.rpc)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`Bridging ${amount} ETH from ${fromChain} to Abstract`)
  console.log(`Wallet: ${wallet.address}`)

  // Check balance
  const balance = await provider.getBalance(wallet.address)
  const balanceEth = Number(balance) / 1e18
  console.log(`Balance on ${fromChain}: ${balanceEth.toFixed(6)} ETH`)

  const amountWei = ethers.parseEther(amount)
  if (balance < amountWei) {
    console.error(`Insufficient balance. Need ${amount} ETH, have ${balanceEth.toFixed(6)} ETH`)
    process.exit(1)
  }

  // Relay uses a simple deposit to their contract
  // The Relay API handles the rest
  console.log(`\nSending to Relay depositor: ${chain.relayDepositor}`)

  const tx = await wallet.sendTransaction({
    to: chain.relayDepositor,
    value: amountWei,
    data: '0x', // Simple ETH transfer
  })

  console.log(`TX sent: ${tx.hash}`)
  console.log(`Waiting for confirmation...`)

  const receipt = await tx.wait()
  console.log(`\n✅ Deposit confirmed!`)
  console.log(`Block: ${receipt.blockNumber}`)
  console.log(`\nRelay will bridge to Abstract within ~1-5 minutes.`)
  console.log(`Track at: https://relay.link/`)

  return receipt
}

main().catch((e) => {
  console.error('Bridge failed:', e.message)
  process.exit(1)
})
