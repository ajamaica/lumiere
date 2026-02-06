/**
 * Myriad Markets Trading Script
 * Uses myriad-sdk (polkamarkets-js under the hood) to place predictions on Abstract
 *
 * Usage:
 *   node scripts/myriad-trade.js list                    - List open markets
 *   node scripts/myriad-trade.js info <marketId>         - Get market details
 *   node scripts/myriad-trade.js buy <marketId> <outcomeId> <value> - Buy shares
 *   node scripts/myriad-trade.js portfolio               - View portfolio
 */

require('dotenv').config({ path: '.env.local' })

const ABSTRACT_RPC = 'https://api.mainnet.abs.xyz'
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
const MYRIAD_API_KEY = process.env.MYRIAD_API_KEY_PROD
const MYRIAD_API_URL = 'https://api-v2.myriadprotocol.com'

// Set env vars the SDK expects
process.env.WEB3_PROVIDER = ABSTRACT_RPC
process.env.WEB3_PRIVATE_KEY = PRIVATE_KEY
process.env.MAINNET = 'true'

async function getMyriadClient() {
  const { default: MyriadClient } = require('myriad-sdk')
  return new MyriadClient()
}

async function listMarkets() {
  const res = await fetch(
    `${MYRIAD_API_URL}/markets?api_key=${MYRIAD_API_KEY}&state=open&limit=10&sort=volume`,
  )
  const json = await res.json()
  const data = json.data || json

  console.log('\n📊 Open Markets on Myriad:\n')
  for (const m of data) {
    const outcomes =
      m.outcomes?.map((o) => `${o.title}: ${(o.price * 100).toFixed(1)}%`).join(' | ') || 'N/A'
    console.log(`  [${m.id}] ${m.title}`)
    console.log(`       Outcomes: ${outcomes}`)
    console.log(`       Volume: $${m.volume_formatted || m.volume || 'N/A'}`)
    console.log('')
  }
}

async function getMarketInfo(marketId) {
  // Use API for detailed info
  const res = await fetch(`${MYRIAD_API_URL}/markets?api_key=${MYRIAD_API_KEY}&state=open`)
  const json = await res.json()
  const markets = json.data || json
  const market = markets.find((m) => String(m.id) === String(marketId))

  if (!market) {
    console.log(`Market ${marketId} not found in open markets. Trying on-chain...`)
  } else {
    console.log(`\n📊 Market: ${market.title}`)
    console.log(`   ID: ${market.id}`)
    console.log(`   State: ${market.state}`)
    console.log(`   Outcomes:`)
    for (const o of market.outcomes || []) {
      console.log(
        `     [${o.id}] ${o.title} — Price: ${(o.price * 100).toFixed(1)}% | Shares: ${o.shares}`,
      )
    }
  }

  // Also try on-chain data
  try {
    const client = await getMyriadClient()
    await client.polkamarket.login()
    const pm = await client.polkamarket.getPredictionMarketContract()

    const marketData = await pm.getMarketData(marketId)
    console.log('\n   On-chain data:', JSON.stringify(marketData, null, 2))

    const prices = await pm.getMarketPrices(marketId)
    console.log('   On-chain prices:', JSON.stringify(prices, null, 2))
  } catch (e) {
    console.log('   On-chain query failed:', e.message)
  }
}

async function buyShares(marketId, outcomeId, value) {
  console.log(`\n🎯 Buying shares on Market ${marketId}, Outcome ${outcomeId}, Value: ${value}`)

  const client = await getMyriadClient()
  await client.polkamarket.login()
  const address = await client.polkamarket.getUserAddress()
  console.log(`   Wallet: ${address}`)

  const pm = await client.polkamarket.getPredictionMarketContract()

  // Calculate minimum shares for slippage protection
  console.log('   Calculating buy amount for slippage protection...')
  try {
    const minShares = await pm.calcBuyAmount({
      marketId: String(marketId),
      outcomeId: String(outcomeId),
      value: String(value),
    })
    console.log(`   Min shares to receive: ${minShares}`)

    // Execute buy
    console.log('   Executing buy transaction...')
    const tx = await pm.buy({
      marketId: String(marketId),
      outcomeId: String(outcomeId),
      value: String(value),
      minOutcomeSharesToBuy: String(minShares),
      wrapped: true, // Using ERC20 token (PTS/USDC)
    })

    console.log('   Transaction submitted!')
    if (tx && tx.wait) {
      const receipt = await tx.wait()
      console.log(`   ✅ Confirmed! Hash: ${receipt.transactionHash}`)
    } else {
      console.log('   Result:', JSON.stringify(tx, null, 2))
    }
  } catch (e) {
    console.error('   ❌ Error:', e.message)
    if (e.message.includes('insufficient')) {
      console.log('   💡 You may need PTS tokens. Check your balance.')
    }
  }
}

async function getPortfolio() {
  console.log('\n📁 Fetching portfolio...')

  const client = await getMyriadClient()
  await client.polkamarket.login()
  const address = await client.polkamarket.getUserAddress()
  console.log(`   Wallet: ${address}`)

  const pm = await client.polkamarket.getPredictionMarketContract()

  try {
    const portfolio = await pm.getMyPortfolio()
    console.log('\n   Portfolio:', JSON.stringify(portfolio, null, 2))
  } catch (e) {
    console.error('   ❌ Error:', e.message)
  }
}

// CLI
const [, , command, ...args] = process.argv

switch (command) {
  case 'list':
    listMarkets().catch(console.error)
    break
  case 'info':
    if (!args[0]) {
      console.log('Usage: node myriad-trade.js info <marketId>')
      process.exit(1)
    }
    getMarketInfo(args[0]).catch(console.error)
    break
  case 'buy':
    if (args.length < 3) {
      console.log('Usage: node myriad-trade.js buy <marketId> <outcomeId> <value>')
      process.exit(1)
    }
    buyShares(args[0], args[1], args[2]).catch(console.error)
    break
  case 'portfolio':
    getPortfolio().catch(console.error)
    break
  default:
    console.log('Myriad Markets Trading Script')
    console.log('Commands: list, info <id>, buy <marketId> <outcomeId> <value>, portfolio')
}
