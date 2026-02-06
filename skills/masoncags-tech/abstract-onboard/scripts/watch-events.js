#!/usr/bin/env node
/**
 * Watch for on-chain events on Abstract
 *
 * Usage:
 *   node watch-events.js transfers <wallet>              # Watch ETH transfers to/from wallet
 *   node watch-events.js erc20 <token> <wallet>          # Watch token transfers
 *   node watch-events.js contract <address> [eventName]  # Watch contract events
 *   node watch-events.js blocks                          # Watch new blocks
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
const ABSTRACT_WSS = 'wss://api.mainnet.abs.xyz' // May not be available

const ERC20_ABI = ['event Transfer(address indexed from, address indexed to, uint256 value)']

async function watchBlocks(provider) {
  console.log('👀 Watching new blocks on Abstract...\n')
  console.log('Press Ctrl+C to stop\n')

  let lastBlock = await provider.getBlockNumber()
  console.log(`Starting from block ${lastBlock}`)

  // Poll for new blocks (since WSS may not be available)
  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber()
      if (currentBlock > lastBlock) {
        for (let i = lastBlock + 1; i <= currentBlock; i++) {
          const block = await provider.getBlock(i)
          console.log(
            `📦 Block ${i} | Txs: ${block.transactions.length} | Time: ${new Date(block.timestamp * 1000).toISOString()}`,
          )
        }
        lastBlock = currentBlock
      }
    } catch (e) {
      console.error('Error fetching block:', e.message)
    }
  }, 2000)
}

async function watchEthTransfers(provider, wallet) {
  console.log(`👀 Watching ETH transfers for ${wallet}...\n`)
  console.log('Press Ctrl+C to stop\n')

  let lastBlock = await provider.getBlockNumber()

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber()
      if (currentBlock > lastBlock) {
        for (let i = lastBlock + 1; i <= currentBlock; i++) {
          const block = await provider.getBlock(i, true)
          if (block && block.prefetchedTransactions) {
            for (const tx of block.prefetchedTransactions) {
              if (
                tx.from?.toLowerCase() === wallet.toLowerCase() ||
                tx.to?.toLowerCase() === wallet.toLowerCase()
              ) {
                const direction = tx.from.toLowerCase() === wallet.toLowerCase() ? 'OUT' : 'IN'
                console.log(`💸 ${direction} | ${ethers.formatEther(tx.value)} ETH | ${tx.hash}`)
              }
            }
          }
        }
        lastBlock = currentBlock
      }
    } catch (e) {
      // Ignore errors silently for polling
    }
  }, 2000)
}

async function watchERC20Transfers(provider, tokenAddress, wallet) {
  console.log(`👀 Watching ERC20 transfers for ${wallet}...\n`)
  console.log(`Token: ${tokenAddress}`)
  console.log('Press Ctrl+C to stop\n')

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

  // Get token info
  let symbol = 'TOKEN'
  let decimals = 18
  try {
    const fullAbi = [
      ...ERC20_ABI,
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
    ]
    const fullToken = new ethers.Contract(tokenAddress, fullAbi, provider)
    symbol = await fullToken.symbol()
    decimals = await fullToken.decimals()
  } catch (e) {}

  let lastBlock = await provider.getBlockNumber()

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber()
      if (currentBlock > lastBlock) {
        // Query transfer events
        const filter = token.filters.Transfer(null, null)
        const events = await token.queryFilter(filter, lastBlock + 1, currentBlock)

        for (const event of events) {
          const { from, to, value } = event.args
          if (
            from.toLowerCase() === wallet.toLowerCase() ||
            to.toLowerCase() === wallet.toLowerCase()
          ) {
            const direction = from.toLowerCase() === wallet.toLowerCase() ? 'OUT' : 'IN'
            const amount = ethers.formatUnits(value, decimals)
            console.log(`💰 ${direction} | ${amount} ${symbol} | Block ${event.blockNumber}`)
          }
        }

        lastBlock = currentBlock
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 3000)
}

async function watchContractEvents(provider, contractAddress, eventName = null) {
  console.log(`👀 Watching events on contract ${contractAddress}...\n`)
  if (eventName) console.log(`Filtering for: ${eventName}`)
  console.log('Press Ctrl+C to stop\n')

  let lastBlock = await provider.getBlockNumber()

  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber()
      if (currentBlock > lastBlock) {
        // Get logs for the contract
        const logs = await provider.getLogs({
          address: contractAddress,
          fromBlock: lastBlock + 1,
          toBlock: currentBlock,
        })

        for (const log of logs) {
          console.log(
            `📝 Event | Block ${log.blockNumber} | Topic: ${log.topics[0]?.slice(0, 10)}...`,
          )
          console.log(`   Data: ${log.data.slice(0, 66)}...`)
        }

        lastBlock = currentBlock
      }
    } catch (e) {
      // Ignore polling errors
    }
  }, 3000)
}

async function main() {
  const [, , action, ...args] = process.argv
  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)

  if (!action) {
    console.log('👀 Abstract Event Watcher\n')
    console.log('Usage:')
    console.log('  node watch-events.js blocks                        # Watch new blocks')
    console.log('  node watch-events.js transfers <wallet>            # Watch ETH transfers')
    console.log('  node watch-events.js erc20 <token> <wallet>        # Watch token transfers')
    console.log('  node watch-events.js contract <address> [event]    # Watch contract events')
    return
  }

  switch (action) {
    case 'blocks':
      await watchBlocks(provider)
      break

    case 'transfers':
      if (!args[0]) {
        console.error('Usage: node watch-events.js transfers <wallet>')
        return
      }
      await watchEthTransfers(provider, args[0])
      break

    case 'erc20':
      if (!args[0] || !args[1]) {
        console.error('Usage: node watch-events.js erc20 <token> <wallet>')
        return
      }
      await watchERC20Transfers(provider, args[0], args[1])
      break

    case 'contract':
      if (!args[0]) {
        console.error('Usage: node watch-events.js contract <address> [eventName]')
        return
      }
      await watchContractEvents(provider, args[0], args[1])
      break

    default:
      console.log('Unknown action:', action)
  }
}

main().catch(console.error)
