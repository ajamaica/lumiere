#!/usr/bin/env node
/**
 * aborean-swap.js - Swap tokens on Aborean DEX (Abstract's native Uniswap V3 fork)
 *
 * Usage:
 *   node aborean-swap.js <tokenIn> <tokenOut> <amountIn> [slippage%]
 *
 * Examples:
 *   node aborean-swap.js ETH USDC 0.01          # Swap 0.01 ETH for USDC
 *   node aborean-swap.js USDC ETH 10            # Swap 10 USDC for ETH
 *   node aborean-swap.js USDC ABX 50 1          # Swap 50 USDC for ABX with 1% slippage
 *
 * Environment:
 *   PRIVATE_KEY - Wallet private key (required)
 *   ABSTRACT_RPC - RPC URL (default: https://api.abstrakcija.net)
 */

const { Provider, Wallet, Contract } = require('zksync-ethers')
const { parseUnits, formatUnits, parseEther, formatEther } = require('ethers')

// Aborean contract addresses (Abstract mainnet)
// Found by tracing real swaps on abscan - this is the active router with 53K+ txs
const ABOREAN_ROUTER = '0xb92fe925DC43a0ECdE6c8b1a2709c170Ec4fFf4f'

// Common tokens on Abstract
const TOKENS = {
  ETH: { address: 'ETH', decimals: 18, symbol: 'ETH' },
  WETH: { address: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809', decimals: 18, symbol: 'WETH' },
  USDC: { address: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1', decimals: 6, symbol: 'USDC' },
  ABX: { address: '0x4C68E4102c0F120cce9F08625bd12079806b7C4D', decimals: 18, symbol: 'ABX' },
  PENGU: { address: '0x9eBe3A824Ca958e4b3Da772D2065518f009CBA62', decimals: 18, symbol: 'PENGU' },
}

// Uniswap V3-style SwapRouter ABI (exactInputSingle)
const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'refundETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    name: 'unwrapWETH9',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'data', type: 'bytes[]' }],
    name: 'multicall',
    outputs: [{ name: 'results', type: 'bytes[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log('Usage: node aborean-swap.js <tokenIn> <tokenOut> <amountIn> [slippage%]')
    console.log('\nTokens: ETH, WETH, USDC, ABX, PENGU (or paste address)')
    console.log('\nExamples:')
    console.log('  node aborean-swap.js ETH USDC 0.01')
    console.log('  node aborean-swap.js USDC ABX 50 1')
    process.exit(1)
  }

  const [tokenInArg, tokenOutArg, amountInArg, slippageArg] = args
  const slippage = parseFloat(slippageArg || '0.5') // Default 0.5% slippage

  // Resolve tokens
  const tokenIn = TOKENS[tokenInArg.toUpperCase()] || {
    address: tokenInArg,
    decimals: 18,
    symbol: tokenInArg.slice(0, 8),
  }
  const tokenOut = TOKENS[tokenOutArg.toUpperCase()] || {
    address: tokenOutArg,
    decimals: 18,
    symbol: tokenOutArg.slice(0, 8),
  }

  // Setup provider and wallet
  const rpcUrl = process.env.ABSTRACT_RPC || 'https://api.mainnet.abs.xyz'
  const provider = new Provider(rpcUrl)

  if (!process.env.PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY environment variable required')
    process.exit(1)
  }

  const wallet = new Wallet(process.env.PRIVATE_KEY, provider)
  console.log(`\n🔄 Aborean Swap on Abstract`)
  console.log(`   Wallet: ${wallet.address}`)

  // Determine if we're swapping ETH or ERC20
  const isETHIn = tokenIn.address === 'ETH'
  const isETHOut = tokenOut.address === 'ETH'

  // Use WETH address for router when dealing with ETH
  const tokenInAddress = isETHIn ? TOKENS.WETH.address : tokenIn.address
  const tokenOutAddress = isETHOut ? TOKENS.WETH.address : tokenOut.address

  // Get token decimals if custom address
  if (!TOKENS[tokenInArg.toUpperCase()] && !isETHIn) {
    const tokenContract = new Contract(tokenIn.address, ERC20_ABI, provider)
    tokenIn.decimals = await tokenContract.decimals()
    tokenIn.symbol = await tokenContract.symbol()
  }
  if (!TOKENS[tokenOutArg.toUpperCase()] && !isETHOut) {
    const tokenContract = new Contract(tokenOut.address, ERC20_ABI, provider)
    tokenOut.decimals = await tokenContract.decimals()
    tokenOut.symbol = await tokenContract.symbol()
  }

  const amountIn = parseUnits(amountInArg, tokenIn.decimals)
  console.log(`   Swapping: ${amountInArg} ${tokenIn.symbol} → ${tokenOut.symbol}`)
  console.log(`   Slippage: ${slippage}%`)

  // Check balance
  if (isETHIn) {
    const balance = await provider.getBalance(wallet.address)
    console.log(`   ETH Balance: ${formatEther(balance)}`)
    if (balance < amountIn) {
      console.error('Error: Insufficient ETH balance')
      process.exit(1)
    }
  } else {
    const tokenContract = new Contract(tokenIn.address, ERC20_ABI, wallet)
    const balance = await tokenContract.balanceOf(wallet.address)
    console.log(`   ${tokenIn.symbol} Balance: ${formatUnits(balance, tokenIn.decimals)}`)
    if (balance < amountIn) {
      console.error(`Error: Insufficient ${tokenIn.symbol} balance`)
      process.exit(1)
    }

    // Check and set approval if needed
    const allowance = await tokenContract.allowance(wallet.address, ABOREAN_ROUTER)
    if (allowance < amountIn) {
      console.log(`\n📝 Approving ${tokenIn.symbol} for Aborean router...`)
      const approveTx = await tokenContract.approve(ABOREAN_ROUTER, amountIn * 2n)
      await approveTx.wait()
      console.log(`   Approved: ${approveTx.hash}`)
    }
  }

  // Setup router contract
  const router = new Contract(ABOREAN_ROUTER, SWAP_ROUTER_ABI, wallet)

  // Fee tier - try 3000 (0.3%) which is common, or 500 (0.05%) for stables
  const isStablePair =
    (tokenIn.symbol === 'USDC' || tokenOut.symbol === 'USDC') &&
    (tokenIn.symbol === 'USDT' ||
      tokenOut.symbol === 'USDT' ||
      tokenIn.symbol === 'DAI' ||
      tokenOut.symbol === 'DAI')
  const fee = isStablePair ? 500 : 3000

  // Deadline 20 minutes from now
  const deadline = Math.floor(Date.now() / 1000) + 1200

  // For now, set amountOutMinimum to 0 for discovery (we'll improve this)
  // In production, you'd want to quote first
  const amountOutMinimum = 0n

  console.log(`\n🚀 Executing swap...`)

  try {
    let tx

    if (isETHIn) {
      // Swapping ETH -> Token
      const params = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: fee,
        recipient: wallet.address,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }

      tx = await router.exactInputSingle(params, { value: amountIn })
    } else if (isETHOut) {
      // Swapping Token -> ETH (need to unwrap WETH)
      const swapParams = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: fee,
        recipient: ABOREAN_ROUTER, // Send to router first
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }

      // Encode multicall: swap + unwrapWETH9
      const swapData = router.interface.encodeFunctionData('exactInputSingle', [swapParams])
      const unwrapData = router.interface.encodeFunctionData('unwrapWETH9', [0, wallet.address])

      tx = await router.multicall([swapData, unwrapData])
    } else {
      // Token -> Token
      const params = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        fee: fee,
        recipient: wallet.address,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }

      tx = await router.exactInputSingle(params)
    }

    console.log(`   Tx Hash: ${tx.hash}`)
    console.log(`   Waiting for confirmation...`)

    const receipt = await tx.wait()
    console.log(`\n✅ Swap complete!`)
    console.log(`   Block: ${receipt.blockNumber}`)
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`)
    console.log(`   Explorer: https://abscan.org/tx/${tx.hash}`)

    // Check new balance
    if (isETHOut) {
      const newBalance = await provider.getBalance(wallet.address)
      console.log(`   New ETH Balance: ${formatEther(newBalance)}`)
    } else {
      const tokenContract = new Contract(tokenOut.address, ERC20_ABI, provider)
      const newBalance = await tokenContract.balanceOf(wallet.address)
      console.log(
        `   New ${tokenOut.symbol} Balance: ${formatUnits(newBalance, tokenOut.decimals)}`,
      )
    }
  } catch (error) {
    console.error('\n❌ Swap failed:', error.message)

    if (error.message.includes('insufficient')) {
      console.log('\nTip: You may need more ETH for gas or the pool may have low liquidity')
    }
    if (error.message.includes('STF')) {
      console.log('\nTip: "STF" = Swap Too Few - try a different fee tier or check pool exists')
    }

    process.exit(1)
  }
}

main().catch(console.error)
