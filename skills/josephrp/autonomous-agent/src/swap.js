#!/usr/bin/env node

/**
 * Swap Script - Swap tokens via Odos aggregator
 * Usage:
 *   node src/swap.js <chain> <fromToken> <toToken> <amount> [--slippage <percent>] [--yes] [--quote-only]
 *   node src/swap.js base eth 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 0.01
 */

import { formatEther, formatUnits, isAddress, parseAbi, parseEther, parseUnits } from 'viem'

import { printUpdateNag } from './check-update.js'
import { getChain, getExplorerTxUrl, getSupportedChains } from './lib/chains.js'
import { createPublicClientWithRetry } from './lib/rpc.js'
import { exists, getAddress, getWalletClient } from './lib/wallet.js'

const ODOS_API = 'https://api.odos.xyz'
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000'

// Standard ERC20 ABI for token info
const ERC20_ABI = parseAbi([
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])

// Parse command line arguments
const args = process.argv.slice(2)
const jsonFlag = args.includes('--json')
const yesFlag = args.includes('--yes') || args.includes('-y')
const helpFlag = args.includes('--help') || args.includes('-h')
const quoteOnlyFlag = args.includes('--quote-only')

// Parse slippage flag
let slippage = 0.5 // default 0.5%
const slippageIdx = args.indexOf('--slippage')
if (slippageIdx !== -1 && args[slippageIdx + 1]) {
  slippage = parseFloat(args[slippageIdx + 1])
  if (isNaN(slippage) || slippage <= 0 || slippage > 50) {
    console.error('Error: Slippage must be between 0 and 50 percent')
    process.exit(1)
  }
}

function showHelp() {
  console.log(`
EVM Token Swap (Odos Aggregator)

Usage: node src/swap.js [options] <chain> <fromToken> <toToken> <amount>

Arguments:
  chain          Chain name (${getSupportedChains().join(', ')})
  fromToken      Token to sell: 'eth' for native, or contract address
  toToken        Token to buy: 'eth' for native, or contract address
  amount         Amount of fromToken to swap

Options:
  --slippage <n> Slippage tolerance in percent (default: 0.5)
  --yes          Skip confirmation prompt
  --quote-only   Get a quote without executing the swap
  --json         Output in JSON format
  --help         Show this help message

Examples:
  node src/swap.js base eth 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 0.01        # Swap 0.01 ETH → USDC on Base
  node src/swap.js base 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 eth 100         # Swap 100 USDC → ETH on Base
  node src/swap.js base eth 0x833589fCD6... 0.01 --slippage 1 --yes                 # 1% slippage, skip confirm
  node src/swap.js base eth 0x833589fCD6... 0.01 --quote-only                       # Just get quote
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
 * Resolve token address — 'eth' or 'native' maps to zero address
 */
function resolveTokenAddress(token) {
  const lower = token.toLowerCase()
  if (lower === 'eth' || lower === 'native' || lower === 'pol') {
    return NATIVE_TOKEN
  }
  if (!isAddress(token)) {
    exitWithError(`Invalid token address: ${token}`)
  }
  return token
}

/**
 * Get token info (symbol, decimals) — handles native token
 */
async function getTokenInfo(publicClient, tokenAddress, chain) {
  if (tokenAddress === NATIVE_TOKEN) {
    return {
      symbol: chain.nativeToken.symbol,
      decimals: chain.nativeToken.decimals,
      name: `Native ${chain.nativeToken.symbol}`,
    }
  }

  try {
    const [symbol, decimals, name] = await Promise.all([
      publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      publicClient.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'name' }),
    ])
    return { symbol, decimals: Number(decimals), name }
  } catch (error) {
    exitWithError(`Failed to get token info for ${tokenAddress}: ${error.message}`)
  }
}

/**
 * Get token balance
 */
async function getBalance(publicClient, tokenAddress, walletAddress) {
  if (tokenAddress === NATIVE_TOKEN) {
    return await publicClient.getBalance({ address: walletAddress })
  }
  return await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletAddress],
  })
}

/**
 * Check and set ERC20 approval for Odos router if needed
 */
async function ensureApproval(
  publicClient,
  walletClient,
  tokenAddress,
  spender,
  amount,
  walletAddress,
) {
  if (tokenAddress === NATIVE_TOKEN) return // No approval needed for native token

  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletAddress, spender],
  })

  if (currentAllowance >= amount) return // Already approved

  if (!jsonFlag) {
    console.log('⏳ Approving token spend...')
  }

  const approveTx = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  })

  // Wait for approval to be mined
  const receipt = await publicClient.waitForTransactionReceipt({ hash: approveTx })
  if (receipt.status !== 'success') {
    exitWithError('Token approval transaction failed')
  }

  if (!jsonFlag) {
    console.log('✅ Token approved')
  }
}

/**
 * Get swap quote from Odos
 */
async function getQuote(chainId, fromToken, toToken, amount, userAddr, slippagePercent) {
  const body = {
    chainId,
    inputTokens: [{ tokenAddress: fromToken, amount: amount.toString() }],
    outputTokens: [{ tokenAddress: toToken, proportion: 1 }],
    userAddr,
    slippageLimitPercent: slippagePercent,
    referralCode: 0,
    disableRFQs: false,
    compact: true,
  }

  const res = await fetch(`${ODOS_API}/sor/quote/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok || !data.pathId) {
    const errMsg = data.detail || data.message || data.error || JSON.stringify(data)
    exitWithError(`Odos quote failed: ${errMsg}`)
  }

  return data
}

/**
 * Assemble swap transaction from Odos
 */
async function assembleSwap(userAddr, pathId) {
  const body = {
    userAddr,
    pathId,
    simulate: true,
  }

  const res = await fetch(`${ODOS_API}/sor/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok || !data.transaction) {
    const errMsg = data.detail || data.message || data.error || JSON.stringify(data)
    exitWithError(`Odos assemble failed: ${errMsg}`)
  }

  return data
}

/**
 * Prompt for user confirmation
 */
async function confirm(message) {
  if (yesFlag || jsonFlag) return true

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

    if (!exists()) {
      exitWithError('No wallet found. Run setup.js first to generate a wallet.')
    }

    // Parse positional args (filter out flags)
    const positional = []
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        // Skip flag and its value if it's --slippage
        if (args[i] === '--slippage') i++
        continue
      }
      if (args[i] === '-y' || args[i] === '-h') continue
      positional.push(args[i])
    }

    const [chainName, fromTokenArg, toTokenArg, amountStr] = positional

    if (!chainName || !fromTokenArg || !toTokenArg || !amountStr) {
      exitWithError('Missing required arguments. Use --help for usage information.')
    }

    const chain = getChain(chainName)
    const publicClient = createPublicClientWithRetry(chainName)
    const walletClient = getWalletClient(chainName)
    const walletAddress = getAddress()

    const fromToken = resolveTokenAddress(fromTokenArg)
    const toToken = resolveTokenAddress(toTokenArg)

    if (fromToken === toToken) {
      exitWithError('Cannot swap a token to itself.')
    }

    // Get token info for both sides
    const [fromInfo, toInfo] = await Promise.all([
      getTokenInfo(publicClient, fromToken, chain),
      getTokenInfo(publicClient, toToken, chain),
    ])

    // Parse input amount to raw units
    const inputAmount =
      fromInfo.decimals === 18 ? parseEther(amountStr) : parseUnits(amountStr, fromInfo.decimals)

    // Check balance
    const balance = await getBalance(publicClient, fromToken, walletAddress)
    if (balance < inputAmount) {
      const formattedBalance =
        fromInfo.decimals === 18 ? formatEther(balance) : formatUnits(balance, fromInfo.decimals)
      exitWithError(
        `Insufficient ${fromInfo.symbol} balance. Have: ${formattedBalance}, Need: ${amountStr}`,
      )
    }

    // Get quote from Odos
    if (!jsonFlag) {
      console.log(
        `\n🔍 Getting quote: ${amountStr} ${fromInfo.symbol} → ${toInfo.symbol} on ${chain.name}...`,
      )
    }

    const quote = await getQuote(
      chain.chainId,
      fromToken,
      toToken,
      inputAmount,
      walletAddress,
      slippage,
    )

    // Parse output amount
    const outAmount = BigInt(quote.outAmounts[0])
    const formattedOutput =
      toInfo.decimals === 18 ? formatEther(outAmount) : formatUnits(outAmount, toInfo.decimals)

    // Price impact
    const priceImpact =
      quote.priceImpact !== undefined ? (quote.priceImpact * 100).toFixed(3) : 'N/A'

    const gasEstimateUnits = quote.gasEstimate || 'N/A'

    if (quoteOnlyFlag) {
      if (jsonFlag) {
        console.log(
          JSON.stringify(
            {
              success: true,
              quote: {
                fromToken: { address: fromToken, symbol: fromInfo.symbol, amount: amountStr },
                toToken: { address: toToken, symbol: toInfo.symbol, amount: formattedOutput },
                priceImpact: quote.priceImpact,
                gasEstimate: gasEstimateUnits,
                slippage,
                pathId: quote.pathId,
                chain: chainName,
              },
            },
            null,
            2,
          ),
        )
      } else {
        console.log(`
📊 Swap Quote:
  Sell:         ${amountStr} ${fromInfo.symbol}
  Buy:          ${formattedOutput} ${toInfo.symbol}
  Price Impact: ${priceImpact}%
  Gas Estimate: ${gasEstimateUnits} units
  Slippage:     ${slippage}%
  Chain:        ${chain.name}
`)
      }
      return
    }

    // Show swap details and confirm
    if (!jsonFlag) {
      console.log(`
🔄 Swap Details:
  Sell:         ${amountStr} ${fromInfo.symbol}
  Buy:          ~${formattedOutput} ${toInfo.symbol}
  Price Impact: ${priceImpact}%
  Gas Estimate: ${gasEstimateUnits} units
  Slippage:     ${slippage}%
  Chain:        ${chain.name}
  Wallet:       ${walletAddress}
`)
    }

    const confirmed = await confirm('Proceed with swap?')
    if (!confirmed) {
      if (jsonFlag) {
        console.log(JSON.stringify({ success: false, error: 'Swap cancelled by user' }))
      } else {
        console.log('❌ Swap cancelled.')
      }
      return
    }

    // Assemble the transaction
    if (!jsonFlag) {
      console.log('⏳ Assembling transaction...')
    }

    const assembled = await assembleSwap(walletAddress, quote.pathId)
    const tx = assembled.transaction

    // Approve token if ERC20
    if (fromToken !== NATIVE_TOKEN) {
      await ensureApproval(publicClient, walletClient, fromToken, tx.to, inputAmount, walletAddress)
    }

    // Execute the swap
    if (!jsonFlag) {
      console.log('⏳ Sending swap transaction...')
    }

    const gasParam = tx.gas && BigInt(tx.gas) > 0n ? BigInt(tx.gas) : undefined
    const txHash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value),
      gas: gasParam,
    })

    // Wait for receipt
    if (!jsonFlag) {
      console.log('⏳ Waiting for confirmation...')
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    const explorerUrl = getExplorerTxUrl(chainName, txHash)

    if (receipt.status !== 'success') {
      exitWithError(`Swap transaction reverted. Tx: ${explorerUrl}`)
    }

    if (jsonFlag) {
      console.log(
        JSON.stringify(
          {
            success: true,
            txHash,
            explorerUrl,
            from: walletAddress,
            chain: chainName,
            input: { token: fromToken, symbol: fromInfo.symbol, amount: amountStr },
            output: { token: toToken, symbol: toInfo.symbol, expectedAmount: formattedOutput },
            priceImpact: quote.priceImpact,
            gasUsed: receipt.gasUsed?.toString(),
            slippage,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(`
✅ Swap successful!
  Sold:     ${amountStr} ${fromInfo.symbol}
  Got:      ~${formattedOutput} ${toInfo.symbol}
  Tx Hash:  ${txHash}
  Explorer: ${explorerUrl}

💡 Check your balance: node src/balance.js ${chainName}${toToken !== NATIVE_TOKEN ? ' ' + toToken : ''}
`)
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
