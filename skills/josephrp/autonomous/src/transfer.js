#!/usr/bin/env node

/**
 * Transfer Script - Send ETH or ERC20 tokens
 * Usage:
 *   node src/transfer.js <chain> <to> <amount>                  # Send native ETH
 *   node src/transfer.js <chain> <to> <amount> <tokenAddress>   # Send ERC20
 */

import { formatEther, isAddress, parseAbi, parseEther, parseUnits } from 'viem'

import { printUpdateNag } from './check-update.js'
import { getChain, getExplorerTxUrl } from './lib/chains.js'
import { estimateGas, estimateGasLimit, formatGwei } from './lib/gas.js'
import { createPublicClientWithRetry } from './lib/rpc.js'
import { exists, getWalletClient } from './lib/wallet.js'

// Standard ERC20 ABI
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
])

// Parse command line arguments
const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const yesFlag = args.includes('--yes') || args.includes('-y')
const helpFlag = args.includes('--help') || args.includes('-h')

function showHelp() {
  console.log(`
EVM Wallet Transfer

Usage: node src/transfer.js [options] <chain> <to> <amount> [tokenAddress]

Arguments:
  chain          Chain name (base, ethereum, polygon, arbitrum, optimism)
  to             Recipient address
  amount         Amount to send
  tokenAddress   ERC20 token contract address (optional, for token transfers)

Options:
  --yes          Skip confirmation prompt
  --json         Output in JSON format
  --help         Show this help message

Examples:
  node src/transfer.js base 0x123... 0.01                    # Send 0.01 ETH on Base
  node src/transfer.js base 0x123... 100 0x833589fcd...      # Send 100 USDC on Base
  node src/transfer.js ethereum 0x123... 0.5 --yes          # Send 0.5 ETH, skip confirmation
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
    throw new Error(`Failed to get token info: ${error.message}`)
  }
}

/**
 * Check token balance
 */
async function checkTokenBalance(client, tokenAddress, walletAddress) {
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    })
    return balance
  } catch (error) {
    throw new Error(`Failed to check token balance: ${error.message}`)
  }
}

/**
 * Prompt for user confirmation
 */
async function confirm(message) {
  if (yesFlag || jsonFlag) {
    return true
  }

  process.stdout.write(`${message} (y/N): `)

  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const response = data.toString().trim().toLowerCase()
      resolve(response === 'y' || response === 'yes')
    })
  })
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

    // Parse arguments
    const filteredArgs = args.filter((arg) => !arg.startsWith('--'))
    const [chainName, to, amount, tokenAddress] = filteredArgs

    if (!chainName || !to || !amount) {
      exitWithError('Missing required arguments. Use --help for usage information.')
    }

    // Validate recipient address
    if (!isAddress(to)) {
      exitWithError('Invalid recipient address.')
    }

    // Validate token address if provided
    if (tokenAddress && !isAddress(tokenAddress)) {
      exitWithError('Invalid token address.')
    }

    const chain = getChain(chainName)
    const publicClient = createPublicClientWithRetry(chainName)
    const walletClient = getWalletClient(chainName)
    const walletAddress = walletClient.account.address

    let transferAmount, symbol, decimals, name
    let isNativeTransfer = !tokenAddress

    if (isNativeTransfer) {
      // Native token transfer
      transferAmount = parseEther(amount)
      symbol = chain.nativeToken.symbol
      decimals = 18
      name = `Native ${symbol}`

      // Check ETH balance
      const balance = await publicClient.getBalance({ address: walletAddress })
      if (balance < transferAmount) {
        exitWithError(
          `Insufficient balance. Have: ${formatEther(balance)} ${symbol}, Need: ${amount} ${symbol}`,
        )
      }
    } else {
      // ERC20 token transfer
      const tokenInfo = await getTokenInfo(publicClient, tokenAddress)
      symbol = tokenInfo.symbol
      decimals = tokenInfo.decimals
      name = tokenInfo.name

      transferAmount = parseUnits(amount, decimals)

      // Check token balance
      const tokenBalance = await checkTokenBalance(publicClient, tokenAddress, walletAddress)
      if (tokenBalance < transferAmount) {
        const formattedBalance =
          decimals === 18
            ? formatEther(tokenBalance)
            : (Number(tokenBalance) / 10 ** decimals).toString()
        exitWithError(
          `Insufficient token balance. Have: ${formattedBalance} ${symbol}, Need: ${amount} ${symbol}`,
        )
      }
    }

    // Estimate gas
    let gasEstimate
    try {
      if (isNativeTransfer) {
        gasEstimate = await estimateGas(chainName)
        const gasLimit = await estimateGasLimit(publicClient, {
          to,
          value: transferAmount,
          account: walletAddress,
        })
        gasEstimate.gasLimit = gasLimit
      } else {
        gasEstimate = await estimateGas(chainName)
        const gasLimit = await estimateGasLimit(publicClient, {
          to: tokenAddress,
          data: walletClient.encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [to, transferAmount],
          }),
          account: walletAddress,
        })
        gasEstimate.gasLimit = gasLimit
      }
    } catch (error) {
      exitWithError(`Gas estimation failed: ${error.message}`)
    }

    // Calculate total cost for native transfers
    const estimatedGasCost = gasEstimate.maxFeePerGas * gasEstimate.gasLimit
    const estimatedGasCostEth = formatEther(estimatedGasCost)

    // Show confirmation details
    const confirmationMessage = `
🚀 Transfer Details:
  From: ${walletAddress}
  To: ${to}
  Amount: ${amount} ${symbol}${tokenAddress ? ` (${name})` : ''}
  Chain: ${chain.name}
  
⛽ Gas Estimate:
  Gas Limit: ${gasEstimate.gasLimit.toLocaleString()}
  Max Fee: ${formatGwei(gasEstimate.maxFeePerGas)} gwei
  Est. Cost: ${estimatedGasCostEth} ETH
  
${isNativeTransfer ? `💰 Total Deduction: ${(parseFloat(amount) + parseFloat(estimatedGasCostEth)).toFixed(6)} ETH` : `💰 Gas Cost: ${estimatedGasCostEth} ETH (separate from token transfer)`}

Proceed with transfer?`

    if (!jsonFlag) {
      console.log(confirmationMessage)
    }

    const confirmed = await confirm('')
    if (!confirmed) {
      if (jsonFlag) {
        console.log(JSON.stringify({ success: false, error: 'Transfer cancelled by user' }))
      } else {
        console.log('❌ Transfer cancelled.')
      }
      return
    }

    // Execute transfer
    let txHash
    try {
      if (isNativeTransfer) {
        // Send native token
        txHash = await walletClient.sendTransaction({
          to,
          value: transferAmount,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
          gas: gasEstimate.gasLimit,
        })
      } else {
        // Send ERC20 token
        txHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, transferAmount],
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
          gas: gasEstimate.gasLimit,
        })
      }
    } catch (error) {
      exitWithError(`Transfer failed: ${error.message}`)
    }

    const explorerUrl = getExplorerTxUrl(chainName, txHash)

    if (jsonFlag) {
      console.log(
        JSON.stringify(
          {
            success: true,
            txHash,
            explorerUrl,
            from: walletAddress,
            to,
            amount,
            symbol,
            chain: chainName,
            tokenAddress: tokenAddress || null,
            gasUsed: {
              maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
              maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas.toString(),
              gasLimit: gasEstimate.gasLimit.toString(),
              estimatedCostEth: estimatedGasCostEth,
            },
          },
          null,
          2,
        ),
      )
    } else {
      console.log('\n✅ Transfer successful!')
      console.log(`Tx Hash: ${txHash}`)
      console.log(`Explorer: ${explorerUrl}`)
      console.log(`\nSent ${amount} ${symbol} to ${to}`)
      console.log(`Gas used: ~${estimatedGasCostEth} ETH`)
      console.log('\n💡 Transaction may take a few minutes to confirm.')
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
