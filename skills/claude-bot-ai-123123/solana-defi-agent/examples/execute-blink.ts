/**
 * Example: Execute a Blink
 *
 * Run: npx tsx examples/execute-blink.ts
 */

import { config } from 'dotenv'
config()

import { BlinksExecutor } from '../src/lib/blinks.js'
import { getConnection } from '../src/lib/connection.js'
import { DialectClient } from '../src/lib/dialect.js'
import { Wallet } from '../src/lib/wallet.js'

async function main() {
  // Load wallet and connection
  const wallet = Wallet.fromEnv()
  const connection = getConnection()

  console.log(`Wallet: ${wallet.address}`)
  console.log(`RPC: ${connection.rpcEndpoint}`)
  console.log()

  // Initialize clients
  const dialect = new DialectClient()
  const blinks = new BlinksExecutor(connection)

  // Find a yield market
  const markets = await dialect.getMarkets({
    type: 'yield',
    provider: 'kamino',
  })

  if (markets.length === 0) {
    console.log('No yield markets found')
    return
  }

  const market = markets[0]
  console.log(`Selected market: ${market.id}`)

  if (!market.actions.deposit?.blinkUrl) {
    console.log('No deposit action available')
    return
  }

  // Inspect the blink
  console.log('\n=== Inspecting Blink ===')
  const inspection = await blinks.inspect(market.actions.deposit.blinkUrl)
  console.log('Title:', inspection.metadata.title)
  console.log('Description:', inspection.metadata.description)
  console.log('Actions:', inspection.actions.map((a) => a.label).join(', '))

  // Get transaction (dry run)
  console.log('\n=== Getting Transaction ===')
  const blinkTx = await blinks.getTransaction(
    market.actions.deposit.blinkUrl,
    wallet.address,
    { amount: '0.01' }, // Small amount for testing
  )
  console.log('Transaction message:', blinkTx.message)

  // Simulate
  console.log('\n=== Simulating ===')
  const simResult = await blinks.simulate(blinkTx)
  console.log('Success:', simResult.success)
  console.log('Units consumed:', simResult.unitsConsumed)
  if (simResult.error) {
    console.log('Error:', simResult.error)
  }

  // Uncomment to actually execute:
  // console.log('\n=== Executing ===');
  // const signature = await blinks.signAndSend(blinkTx, wallet.getSigner());
  // console.log('Signature:', signature);
  // console.log('Explorer:', `https://solscan.io/tx/${signature}`);
}

main().catch(console.error)
