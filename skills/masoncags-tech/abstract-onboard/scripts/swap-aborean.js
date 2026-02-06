const { ethers } = require('ethers')

// Aborean Router (Slipstream/V3 style)
const ROUTER = '0xada5d0e79681038a9547fe6a59f1413f3e720839'
const USDC = '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'
const WETH = '0x3439153EB7AF838Ad19d56E1571FBD09333C2809'

// Slipstream/CL Router ABI
const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, int24 tickSpacing, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, int24 tickSpacing, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
]

async function main() {
  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) throw new Error('WALLET_PRIVATE_KEY not set')

  const provider = new ethers.JsonRpcProvider('https://api.mainnet.abs.xyz')
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log('Wallet:', wallet.address)
  console.log('Aborean CL Router:', ROUTER)

  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet)
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet)

  const balance = await usdc.balanceOf(wallet.address)
  console.log('USDC Balance:', ethers.formatUnits(balance, 6))

  const amountIn = BigInt(1000000) // $1 USDC
  console.log('\nSwapping:', ethers.formatUnits(amountIn, 6), 'USDC for WETH via Aborean CL')

  // Common tick spacings to try: 100, 200, 1
  const tickSpacings = [100, 200, 1, 50, 10]

  for (const tickSpacing of tickSpacings) {
    try {
      console.log(`\nTrying tick spacing: ${tickSpacing}`)

      // Approve first
      const allowance = await usdc.allowance(wallet.address, ROUTER)
      if (allowance < amountIn) {
        console.log('Approving USDC...')
        const approveTx = await usdc.approve(ROUTER, ethers.MaxUint256)
        await approveTx.wait()
        console.log('Approved!')
      }

      const deadline = Math.floor(Date.now() / 1000) + 300

      const params = {
        tokenIn: USDC,
        tokenOut: WETH,
        tickSpacing: tickSpacing,
        recipient: wallet.address,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: 0, // For test, accept any amount
        sqrtPriceLimitX96: 0,
      }

      console.log('Executing exactInputSingle...')
      const swapTx = await router.exactInputSingle(params)

      console.log('TX:', swapTx.hash)
      const receipt = await swapTx.wait()
      console.log('Confirmed in block:', receipt.blockNumber)
      console.log('\n✅ Aborean CL swap complete!')
      console.log('https://abscan.org/tx/' + swapTx.hash)
      return // Success!
    } catch (e) {
      console.log(`Tick spacing ${tickSpacing} failed:`, e.message?.slice(0, 80))
    }
  }

  console.log('\nAll tick spacings failed - pool might not exist for USDC/WETH')
}

main().catch(console.error)
