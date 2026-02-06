#!/usr/bin/env node

/**
 * Balance Script - Check ETH and token balances
 * Usage:
 *   node src/balance.js <chain>                    # Native token balance
 *   node src/balance.js <chain> <tokenAddress>     # ERC20 balance
 *   node src/balance.js --all                      # All chains, native tokens
 */

import { formatEther, parseAbi } from 'viem'

import { printUpdateNag } from './check-update.js'
import { getChain, getExplorerAddressUrl, getSupportedChains } from './lib/chains.js'
import { createPublicClientWithRetry } from './lib/rpc.js'
import { exists, getAddress } from './lib/wallet.js'

// Standard ERC20 ABI for balance and metadata
const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
])

// Parse command line arguments
const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const allFlag = args.includes('--all')
const helpFlag = args.includes('--help') || args.includes('-h')

function showHelp() {
  console.log(`
EVM Wallet Balance Checker

Usage: node src/balance.js [options] <chain> [tokenAddress]

Arguments:
  chain          Chain name (${getSupportedChains().join(', ')})
  tokenAddress   ERC20 token contract address (optional)

Options:
  --all          Check all chains for native token balances
  --json         Output in JSON format
  --help         Show this help message

Examples:
  node src/balance.js base                           # ETH balance on Base
  node src/balance.js ethereum 0x833589fcd6edb...    # USDC balance on Ethereum
  node src/balance.js --all                          # All chains, native tokens
  node src/balance.js --all --json                   # All chains, JSON output
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

/**
 * Get token info (symbol, decimals, name)
 */
async function getTokenInfo(client, tokenAddress) {
  try {
    const [symbol, decimals, name] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
      }),
    ])

    return { symbol, decimals, name }
  } catch (error) {
    return { symbol: 'UNKNOWN', decimals: 18, name: 'Unknown Token' }
  }
}

/**
 * Format token balance with proper decimals
 */
function formatTokenBalance(balance, decimals) {
  const divisor = 10n ** BigInt(decimals)
  const wholePart = balance / divisor
  const fractionalPart = balance % divisor

  if (fractionalPart === 0n) {
    return wholePart.toString()
  }

  const fractionalStr = fractionalPart.toString().padStart(Number(decimals), '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')

  if (trimmedFractional === '') {
    return wholePart.toString()
  }

  return `${wholePart}.${trimmedFractional}`
}

/**
 * Check balance for a specific chain
 */
async function checkBalance(chainName, tokenAddress = null) {
  try {
    const client = createPublicClientWithRetry(chainName)
    const address = getAddress()
    const chain = getChain(chainName)

    let balance, symbol, decimals, name

    if (tokenAddress) {
      // ERC20 token balance
      balance = await client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      })

      const tokenInfo = await getTokenInfo(client, tokenAddress)
      symbol = tokenInfo.symbol
      decimals = tokenInfo.decimals
      name = tokenInfo.name
    } else {
      // Native token balance
      balance = await client.getBalance({ address })
      symbol = chain.nativeToken.symbol
      decimals = chain.nativeToken.decimals
      name = `Native ${symbol}`
    }

    const formattedBalance =
      decimals === 18 ? formatEther(balance) : formatTokenBalance(balance, decimals)

    return {
      success: true,
      chain: chainName,
      address,
      balance: formattedBalance,
      symbol,
      decimals,
      name,
      tokenAddress,
      explorerUrl: getExplorerAddressUrl(chainName, address),
    }
  } catch (error) {
    return {
      success: false,
      chain: chainName,
      error: error.message,
    }
  }
}

/**
 * Check balances for all chains
 */
async function checkAllBalances() {
  const chains = getSupportedChains()
  const results = await Promise.all(chains.map((chainName) => checkBalance(chainName)))
  return results
}

async function main() {
  try {
    if (helpFlag) {
      showHelp()
      return
    }

    // Check if wallet exists
    if (!exists()) {
      exitWithError('No wallet found. Run setup.js first to generate a wallet.')
    }

    if (allFlag) {
      // Check all chains
      const results = await checkAllBalances()

      if (jsonFlag) {
        console.log(JSON.stringify({ success: true, balances: results }, null, 2))
      } else {
        const address = getAddress()
        console.log(`\n💰 Wallet Balances`)
        console.log(`Address: ${address}\n`)

        for (const result of results) {
          if (result.success) {
            const hasBalance = parseFloat(result.balance) > 0
            const icon = hasBalance ? '💰' : '🕳️ '
            console.log(
              `${icon} ${result.chain.toUpperCase().padEnd(10)} ${result.balance} ${result.symbol}`,
            )
          } else {
            console.log(`❌ ${result.chain.toUpperCase().padEnd(10)} Error: ${result.error}`)
          }
        }
        console.log()
      }
    } else {
      // Check specific chain
      const chainName = args.find((arg) => !arg.startsWith('--'))
      const tokenAddress = args.find((arg) => !arg.startsWith('--') && arg !== chainName)

      if (!chainName) {
        exitWithError('Chain name is required. Use --help for usage information.')
      }

      const result = await checkBalance(chainName, tokenAddress)

      if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        if (result.success) {
          const hasBalance = parseFloat(result.balance) > 0
          const icon = hasBalance ? '💰' : '🕳️'

          console.log(`\n${icon} Balance on ${result.chain.toUpperCase()}`)
          console.log(`Address: ${result.address}`)
          console.log(`Balance: ${result.balance} ${result.symbol}`)

          if (result.tokenAddress) {
            console.log(`Token: ${result.name} (${result.tokenAddress})`)
          }

          console.log(`Explorer: ${result.explorerUrl}\n`)

          if (!hasBalance) {
            console.log('💡 Tip: Fund your wallet to start using it!')
            if (result.chain === 'base') {
              console.log('   Base has the lowest fees for testing.')
            }
          }
        } else {
          exitWithError(result.error)
        }
      }
    }
  } catch (error) {
    exitWithError(`Unexpected error: ${error.message}`)
  }
}

main()
  .then(() => printUpdateNag())
  .catch((error) => {
    exitWithError(`Unexpected error: ${error.message}`)
  })
