const { ethers } = require('ethers')

// Uniswap V2 Router on Abstract
const ROUTER = '0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c'
const USDC = '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'
const WETH = '0x3439153EB7AF838Ad19d56E1571FBD09333C2809'

const ROUTER_ABI = [
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
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

  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet)
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet)

  // Check USDC balance
  const balance = await usdc.balanceOf(wallet.address)
  console.log('USDC Balance:', ethers.formatUnits(balance, 6))

  // Swap amount: $1 USDC = 1000000 (6 decimals)
  const amountIn = BigInt(1000000)
  console.log('Swapping:', ethers.formatUnits(amountIn, 6), 'USDC for ETH')

  // Get expected output
  try {
    const amounts = await router.getAmountsOut(amountIn, [USDC, WETH])
    console.log('Expected ETH out:', ethers.formatEther(amounts[1]))

    // Check allowance
    const allowance = await usdc.allowance(wallet.address, ROUTER)
    console.log('Current allowance:', ethers.formatUnits(allowance, 6))

    if (allowance < amountIn) {
      console.log('\nApproving USDC...')
      const approveTx = await usdc.approve(ROUTER, amountIn)
      console.log('Approve TX:', approveTx.hash)
      await approveTx.wait()
      console.log('Approved!')
    }

    // Execute swap
    console.log('\nExecuting swap...')
    const deadline = Math.floor(Date.now() / 1000) + 300 // 5 minutes
    const minOut = (amounts[1] * BigInt(95)) / BigInt(100) // 5% slippage

    const swapTx = await router.swapExactTokensForETH(
      amountIn,
      minOut,
      [USDC, WETH],
      wallet.address,
      deadline,
    )

    console.log('Swap TX:', swapTx.hash)
    const receipt = await swapTx.wait()
    console.log('Confirmed in block:', receipt.blockNumber)
    console.log('\n✅ Swap complete! Check balance.')
    console.log('Explorer: https://abscan.org/tx/' + swapTx.hash)
  } catch (e) {
    console.error('Error:', e.message)
    if (e.message.includes('INSUFFICIENT_LIQUIDITY')) {
      console.log('No liquidity in USDC/WETH pool on Uniswap V2')
    }
  }
}

main().catch(console.error)
