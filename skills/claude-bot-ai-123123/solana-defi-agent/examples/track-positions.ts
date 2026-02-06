/**
 * Example: Track Portfolio Positions
 *
 * Run: npx tsx examples/track-positions.ts [wallet-address]
 */

import { config } from 'dotenv'
config()

import { DialectClient } from '../src/lib/dialect.js'
import { formatPercent, formatUsd } from '../src/lib/output.js'
import { Wallet } from '../src/lib/wallet.js'

async function main() {
  const walletAddress =
    process.argv[2] ||
    (() => {
      try {
        return Wallet.fromEnv().address
      } catch {
        console.error('Usage: npx tsx examples/track-positions.ts <wallet-address>')
        console.error('Or set SOLANA_PRIVATE_KEY environment variable')
        process.exit(1)
      }
    })()

  console.log(`Tracking positions for: ${walletAddress}\n`)

  const dialect = new DialectClient()

  // Get all positions
  const positions = await dialect.getPositions(walletAddress)

  if (positions.length === 0) {
    console.log('No positions found')
    return
  }

  // Calculate totals
  let totalDeposited = 0
  let totalBorrowed = 0

  console.log('=== Positions ===\n')

  for (const position of positions) {
    console.log(`Market: ${position.marketId}`)
    console.log(`  Type: ${position.type}`)
    console.log(`  Side: ${position.side}`)
    console.log(`  Amount: ${position.amount.toFixed(6)}`)
    console.log(`  Value: ${formatUsd(position.amountUsd)}`)

    if (position.ltv) {
      console.log(`  LTV: ${formatPercent(position.ltv)}`)
    }

    if (position.liquidationPrice) {
      console.log(`  Liquidation Price: $${position.liquidationPrice.toFixed(2)}`)
    }

    // Track totals
    if (position.side === 'deposit') {
      totalDeposited += position.amountUsd
    } else if (position.side === 'borrow') {
      totalBorrowed += position.amountUsd
    }

    // Show available actions
    const actions = Object.keys(position.actions)
    if (actions.length > 0) {
      console.log(`  Actions: ${actions.join(', ')}`)
    }

    console.log()
  }

  console.log('=== Summary ===')
  console.log(`Total Deposited: ${formatUsd(totalDeposited)}`)
  console.log(`Total Borrowed: ${formatUsd(totalBorrowed)}`)
  console.log(`Net Position: ${formatUsd(totalDeposited - totalBorrowed)}`)

  // Group by protocol
  console.log('\n=== By Protocol ===')
  const byProtocol = new Map<string, number>()

  for (const position of positions) {
    const protocol = position.market?.provider?.name || 'Unknown'
    const current = byProtocol.get(protocol) || 0
    byProtocol.set(protocol, current + position.amountUsd)
  }

  for (const [protocol, value] of byProtocol) {
    console.log(`${protocol}: ${formatUsd(value)}`)
  }
}

main().catch(console.error)
