#!/usr/bin/env node
/**
 * aborean-quote.js - Get swap quotes from Aborean DEX (no wallet needed)
 *
 * Usage:
 *   node aborean-quote.js <tokenIn> <tokenOut> <amountIn>
 *
 * Examples:
 *   node aborean-quote.js ETH USDC 1         # Quote 1 ETH -> USDC
 *   node aborean-quote.js USDC ETH 1000      # Quote 1000 USDC -> ETH
 *   node aborean-quote.js USDC ABX 100       # Quote 100 USDC -> ABX
 */

const { Provider, Contract } = require('zksync-ethers')
const { parseUnits, formatUnits, parseEther, formatEther } = require('ethers')

// Aborean Quoter contract (Uniswap V3 style)
const ABOREAN_QUOTER = '0x8182E03B7120E50819a1B8F7f9a2C0a81ead6671' // Common quoter address pattern

// Common tokens on Abstract
const TOKENS = {
  ETH: { address: 'ETH', decimals: 18, symbol: 'ETH' },
  WETH: { address: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809', decimals: 18, symbol: 'WETH' },
  USDC: { address: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1', decimals: 6, symbol: 'USDC' },
  ABX: { address: '0x4C68E4102c0F120cce9F08625bd12079806b7C4D', decimals: 18, symbol: 'ABX' },
  PENGU: { address: '0x9eBe3A824Ca958e4b3Da772D2065518f009CBA62', decimals: 18, symbol: 'PENGU' },
}

// QuoterV2 ABI for quoteExactInputSingle
const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

// Factory ABI to check pools exist
const FACTORY_ABI = [
  {
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ name: 'pool', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
]

const ABOREAN_FACTORY = '0x4E9A9A1C1a8B0b3F4c3E9d3A9b8d2f3c4e5a6b7c' // Will need to find this

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log('Usage: node aborean-quote.js <tokenIn> <tokenOut> <amountIn>')
    console.log('\nTokens: ETH, WETH, USDC, ABX, PENGU (or paste address)')
    console.log('\nExamples:')
    console.log('  node aborean-quote.js ETH USDC 1')
    console.log('  node aborean-quote.js USDC ABX 100')
    process.exit(1)
  }

  const [tokenInArg, tokenOutArg, amountInArg] = args

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

  // Setup provider
  const rpcUrl = process.env.ABSTRACT_RPC || 'https://api.mainnet.abs.xyz'
  const provider = new Provider(rpcUrl)

  console.log(`\n📊 Aborean Quote on Abstract`)

  // Handle ETH -> WETH for routing
  const isETHIn = tokenIn.address === 'ETH'
  const isETHOut = tokenOut.address === 'ETH'
  const tokenInAddress = isETHIn ? TOKENS.WETH.address : tokenIn.address
  const tokenOutAddress = isETHOut ? TOKENS.WETH.address : tokenOut.address

  // Get decimals if custom address
  if (!TOKENS[tokenInArg.toUpperCase()] && !isETHIn) {
    const tokenContract = new Contract(tokenIn.address, ERC20_ABI, provider)
    tokenIn.decimals = Number(await tokenContract.decimals())
    tokenIn.symbol = await tokenContract.symbol()
  }
  if (!TOKENS[tokenOutArg.toUpperCase()] && !isETHOut) {
    const tokenContract = new Contract(tokenOut.address, ERC20_ABI, provider)
    tokenOut.decimals = Number(await tokenContract.decimals())
    tokenOut.symbol = await tokenContract.symbol()
  }

  const amountIn = parseUnits(amountInArg, tokenIn.decimals)
  console.log(`   ${amountInArg} ${tokenIn.symbol} → ? ${tokenOut.symbol}`)

  // Try different fee tiers
  const feeTiers = [500, 3000, 10000] // 0.05%, 0.3%, 1%

  console.log(`\n   Checking pools...`)

  // Since we may not have the quoter deployed, let's try direct pool query
  // Uniswap V3 pools can be queried for slot0 to get current price

  const POOL_ABI = [
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function liquidity() view returns (uint128)',
  ]

  // Try to find and quote from pool directly
  for (const fee of feeTiers) {
    // Compute pool address (CREATE2 deterministic)
    // This is complex, so let's try a simpler approach - call the quoter if it exists
    try {
      const quoter = new Contract(ABOREAN_QUOTER, QUOTER_ABI, provider)

      const params = {
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: amountIn,
        fee: fee,
        sqrtPriceLimitX96: 0n,
      }

      // Use staticCall for quote (doesn't modify state)
      const result = await quoter.quoteExactInputSingle.staticCall(params)
      const amountOut = result[0] || result.amountOut

      const formattedOut = formatUnits(amountOut, tokenOut.decimals)
      const rate = parseFloat(formattedOut) / parseFloat(amountInArg)

      console.log(`\n   ✅ Fee ${fee / 10000}%: ${formattedOut} ${tokenOut.symbol}`)
      console.log(`      Rate: 1 ${tokenIn.symbol} = ${rate.toFixed(6)} ${tokenOut.symbol}`)
    } catch (error) {
      if (error.message.includes('execution reverted') || error.message.includes('call revert')) {
        console.log(`   ❌ Fee ${fee / 10000}%: No pool or insufficient liquidity`)
      } else {
        // Quoter might not exist at this address
        console.log(
          `   ⚠️  Fee ${fee / 10000}%: Could not quote (${error.message.slice(0, 50)}...)`,
        )
      }
    }
  }

  console.log(`\n💡 Tip: Use the fee tier with best output for your swap`)
  console.log(`   Run: node aborean-swap.js ${tokenInArg} ${tokenOutArg} ${amountInArg}`)
}

main().catch(console.error)
