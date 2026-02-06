const { ethers } = require('ethers')

// Kona V2 on Abstract
const ROUTER = '0x441E0627Db5173Da098De86b734d136b27925250'
const FACTORY = '0x7c2e370CA0fCb60D8202b8C5b01f758bcAD41860'
const USDC = '0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1'
const WETH = '0x3439153EB7AF838Ad19d56E1571FBD09333C2809'

// Uniswap V2 Router ABI
const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function WETH() external view returns (address)',
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
  console.log('Kona V2 Router:', ROUTER)

  const router = new ethers.Contract(ROUTER, ROUTER_ABI, wallet)
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet)

  // Check WETH address
  try {
    const weth = await router.WETH()
    console.log('WETH from router:', weth)
  } catch (e) {
    console.log('Could not get WETH from router')
  }

  const balance = await usdc.balanceOf(wallet.address)
  console.log('USDC Balance:', ethers.formatUnits(balance, 6))

  const amountIn = BigInt(1000000) // $1 USDC
  console.log('\nSwapping:', ethers.formatUnits(amountIn, 6), 'USDC for ETH via Kona V2')

  const path = [USDC, WETH]

  try {
    // Get expected output
    const amounts = await router.getAmountsOut(amountIn, path)
    console.log('Expected ETH out:', ethers.formatEther(amounts[1]))

    // Approve
    const allowance = await usdc.allowance(wallet.address, ROUTER)
    if (allowance < amountIn) {
      console.log('\nApproving USDC to Kona Router...')
      const approveTx = await usdc.approve(ROUTER, ethers.MaxUint256)
      await approveTx.wait()
      console.log('Approved!')
    }

    // Swap
    console.log('\nExecuting Kona swap...')
    const deadline = Math.floor(Date.now() / 1000) + 300
    const minOut = (amounts[1] * BigInt(95)) / BigInt(100)

    const swapTx = await router.swapExactTokensForETH(
      amountIn,
      minOut,
      path,
      wallet.address,
      deadline,
    )

    console.log('TX:', swapTx.hash)
    const receipt = await swapTx.wait()
    console.log('Confirmed in block:', receipt.blockNumber)
    console.log('\n✅ Kona V2 swap complete!')
    console.log('https://abscan.org/tx/' + swapTx.hash)
  } catch (e) {
    console.error('Error:', e.message)

    // Check if pool exists
    console.log('\nChecking if USDC/WETH pool exists...')
    const factoryAbi = ['function getPair(address,address) view returns (address)']
    const factory = new ethers.Contract(FACTORY, factoryAbi, provider)
    const pair = await factory.getPair(USDC, WETH)
    console.log('Pair address:', pair)

    if (pair === '0x0000000000000000000000000000000000000000') {
      console.log('No USDC/WETH pool on Kona V2')
    }
  }
}

main().catch(console.error)
