#!/usr/bin/env node
/**
 * Swap tokens on Abstract using DEX router
 *
 * Usage:
 *   export WALLET_PRIVATE_KEY=0x...
 *   node swap-tokens.js --from ETH --to USDC --amount 0.01
 *   node swap-tokens.js --from USDC --to ETH --amount 100
 *
 * Note: Uses Uniswap V3 style router interface
 */

const { ethers } = require('ethers')

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'

// Token addresses
const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000', // Native
  WETH: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809',
  USDC: '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1',
}

// DEX Router - Update this when Abstract has a primary DEX
const ROUTER_ADDRESS = process.env.DEX_ROUTER || '0x0000000000000000000000000000000000000000'

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
]

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let fromToken = 'ETH'
  let toToken = 'USDC'
  let amount = '0.01'
  let slippage = 0.5 // 0.5%

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from') fromToken = args[++i].toUpperCase()
    else if (args[i] === '--to') toToken = args[++i].toUpperCase()
    else if (args[i] === '--amount') amount = args[++i]
    else if (args[i] === '--slippage') slippage = parseFloat(args[++i])
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    console.error('Error: WALLET_PRIVATE_KEY not set')
    process.exit(1)
  }

  if (ROUTER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('Error: DEX_ROUTER environment variable not set')
    console.log('\nAbstract DEX router address needed. Check Abstract docs for available DEXes.')
    console.log('Set it with: export DEX_ROUTER=0x...')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log(`\n🔄 Swap on Abstract`)
  console.log(`From: ${amount} ${fromToken}`)
  console.log(`To: ${toToken}`)
  console.log(`Wallet: ${wallet.address}`)
  console.log(`Slippage: ${slippage}%\n`)

  const fromAddress = TOKENS[fromToken] || fromToken
  const toAddress = TOKENS[toToken] || toToken

  const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet)

  // Build path (through WETH if needed)
  let path
  if (fromToken === 'ETH') {
    path = [TOKENS.WETH, toAddress]
  } else if (toToken === 'ETH') {
    path = [fromAddress, TOKENS.WETH]
  } else {
    path = [fromAddress, TOKENS.WETH, toAddress]
  }

  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  try {
    if (fromToken === 'ETH') {
      // ETH -> Token
      const amountIn = ethers.parseEther(amount)
      const amountsOut = await router.getAmountsOut(amountIn, path)
      const amountOutMin =
        (amountsOut[amountsOut.length - 1] * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

      console.log(
        `Expected out: ~${ethers.formatUnits(amountsOut[amountsOut.length - 1], 6)} ${toToken}`,
      )

      const tx = await router.swapExactETHForTokens(amountOutMin, path, wallet.address, deadline, {
        value: amountIn,
      })

      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Swap complete! Block: ${receipt.blockNumber}`)
    } else if (toToken === 'ETH') {
      // Token -> ETH
      const tokenContract = new ethers.Contract(fromAddress, ERC20_ABI, wallet)
      const decimals = await tokenContract.decimals()
      const amountIn = ethers.parseUnits(amount, decimals)

      // Check and set allowance
      const allowance = await tokenContract.allowance(wallet.address, ROUTER_ADDRESS)
      if (allowance < amountIn) {
        console.log('Approving router...')
        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amountIn)
        await approveTx.wait()
      }

      const amountsOut = await router.getAmountsOut(amountIn, path)
      const amountOutMin =
        (amountsOut[amountsOut.length - 1] * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

      console.log(`Expected out: ~${ethers.formatEther(amountsOut[amountsOut.length - 1])} ETH`)

      const tx = await router.swapExactTokensForETH(
        amountIn,
        amountOutMin,
        path,
        wallet.address,
        deadline,
      )

      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Swap complete! Block: ${receipt.blockNumber}`)
    } else {
      // Token -> Token
      const tokenContract = new ethers.Contract(fromAddress, ERC20_ABI, wallet)
      const decimals = await tokenContract.decimals()
      const amountIn = ethers.parseUnits(amount, decimals)

      const allowance = await tokenContract.allowance(wallet.address, ROUTER_ADDRESS)
      if (allowance < amountIn) {
        console.log('Approving router...')
        const approveTx = await tokenContract.approve(ROUTER_ADDRESS, amountIn)
        await approveTx.wait()
      }

      const amountsOut = await router.getAmountsOut(amountIn, path)
      const amountOutMin =
        (amountsOut[amountsOut.length - 1] * BigInt(Math.floor((100 - slippage) * 100))) / 10000n

      const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        wallet.address,
        deadline,
      )

      console.log(`TX: ${tx.hash}`)
      const receipt = await tx.wait()
      console.log(`✅ Swap complete! Block: ${receipt.blockNumber}`)
    }
  } catch (e) {
    console.error(`Swap failed: ${e.message}`)
    process.exit(1)
  }
}

main().catch(console.error)
