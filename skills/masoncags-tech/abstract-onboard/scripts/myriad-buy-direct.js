/**
 * Myriad Markets - Direct on-chain buy (bypasses buggy SDK)
 * Calls buy(uint256 marketId, uint256 outcomeId, uint256 minOutcomeSharesToBuy, uint256 value)
 * selector: 0x1281311d
 *
 * Usage: node scripts/myriad-buy-direct.js <marketId> <outcomeId> <value_human>
 * Example: node scripts/myriad-buy-direct.js 765 0 1    (buy $1 on Yes)
 */

require('dotenv').config({ path: '.env.local' })
const {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  encodeFunctionData,
  parseUnits,
} = require('viem')
const { privateKeyToAccount } = require('viem/accounts')

const PM_CONTRACT = '0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289'
const RPC = 'https://api.mainnet.abs.xyz'
const MYRIAD_API_KEY = process.env.MYRIAD_API_KEY_PROD
const MYRIAD_API_URL = 'https://api-v2.myriadprotocol.com'

const abstractMainnet = {
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
}

const PM_ABI = parseAbi([
  // buy: (marketId, outcomeId, minShares, value)
  'function buy(uint256 marketId, uint256 outcomeId, uint256 minOutcomeSharesToBuy, uint256 value) external',
  // calcBuyAmount: VALUE FIRST, then marketId, outcomeId
  'function calcBuyAmount(uint256 value, uint256 marketId, uint256 outcomeId) external view returns (uint256)',
])

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function decimals() view returns (uint8)',
])

async function getMarketInfo(marketId) {
  const res = await fetch(
    `${MYRIAD_API_URL}/markets?api_key=${MYRIAD_API_KEY}&state=open&limit=100`,
  )
  const json = await res.json()
  const markets = json.data || json
  return markets.find((m) => String(m.id) === String(marketId))
}

async function main() {
  const [, , marketIdStr, outcomeIdStr, valueStr] = process.argv

  if (!marketIdStr || !outcomeIdStr || !valueStr) {
    console.log('Usage: node scripts/myriad-buy-direct.js <marketId> <outcomeId> <value>')
    process.exit(1)
  }

  const marketId = BigInt(marketIdStr)
  const outcomeId = BigInt(outcomeIdStr)
  const valueHuman = parseFloat(valueStr)

  const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY)
  const publicClient = createPublicClient({ chain: abstractMainnet, transport: http(RPC) })
  const walletClient = createWalletClient({ account, chain: abstractMainnet, transport: http(RPC) })

  // Get market info from API
  const market = await getMarketInfo(marketIdStr)
  if (!market) {
    console.log(`Market ${marketIdStr} not found in API`)
    process.exit(1)
  }

  const token = market.token || {}
  const tokenAddress = token.address
  const tokenDecimals = token.decimals || 18
  const outcomeName = market.outcomes?.[Number(outcomeId)]?.title || `Outcome ${outcomeId}`
  const price = market.outcomes?.[Number(outcomeId)]?.price || 0

  console.log(`\n📊 Market: ${market.title}`)
  console.log(`   Token: ${token.symbol} (${tokenDecimals} decimals) @ ${tokenAddress}`)
  console.log(`   Outcome: [${outcomeId}] ${outcomeName} — ${(price * 100).toFixed(1)}%`)
  console.log(`   Buying: ${valueHuman} ${token.symbol}`)
  console.log(`   Wallet: ${account.address}`)

  // Check balance
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  })
  console.log(`   Balance: ${formatUnits(balance, tokenDecimals)} ${token.symbol}`)

  // Convert value to token units
  const valueInUnits = parseUnits(valueStr, tokenDecimals)
  console.log(`   Value in units: ${valueInUnits}`)

  if (balance < valueInUnits) {
    console.log(`   ❌ Insufficient balance!`)
    process.exit(1)
  }

  // Check/set approval
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, PM_CONTRACT],
  })

  if (allowance < valueInUnits) {
    console.log('   Approving PM contract...')
    const approveTx = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [PM_CONTRACT, 2n ** 256n - 1n],
    })
    console.log(`   Approve TX: ${approveTx}`)
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
    console.log('   ✅ Approved!')
  } else {
    console.log(`   ✅ Already approved (${formatUnits(allowance, tokenDecimals)})`)
  }

  // Calculate min shares using on-chain calcBuyAmount
  console.log('   Calculating expected shares...')
  const minShares = await publicClient.readContract({
    address: PM_CONTRACT,
    abi: PM_ABI,
    functionName: 'calcBuyAmount',
    args: [valueInUnits, marketId, outcomeId], // value first!
  })
  console.log(`   Expected shares: ${minShares} (${formatUnits(minShares, tokenDecimals)} shares)`)

  // Apply 3% slippage
  const minSharesSlippage = (minShares * 97n) / 100n
  console.log(`   Min shares (5% slippage): ${minSharesSlippage}`)

  // Execute buy directly
  console.log('\n   🎯 Executing buy...')
  try {
    const txHash = await walletClient.writeContract({
      address: PM_CONTRACT,
      abi: PM_ABI,
      functionName: 'buy',
      args: [marketId, outcomeId, minSharesSlippage, valueInUnits],
    })
    console.log(`   TX submitted: ${txHash}`)

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status === 'success') {
      console.log(`   ✅ SUCCESS! Hash: ${txHash}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
    } else {
      console.log(`   ❌ Transaction reverted!`)
      console.log(`   Hash: ${txHash}`)
    }
  } catch (e) {
    console.error(`   ❌ Error: ${e.message?.slice(0, 300)}`)
  }
}

main().catch(console.error)
