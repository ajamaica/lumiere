/**
 * Example: Browse DeFi Markets
 *
 * Run: npx tsx examples/browse-markets.ts
 */

import { DialectClient } from '../src/lib/dialect.js'
import { formatPercent, formatUsd } from '../src/lib/output.js'

async function main() {
  const dialect = new DialectClient()

  console.log('=== Best Yield Markets ===\n')
  const yieldMarkets = await dialect.getBestYieldMarkets(5)

  for (const market of yieldMarkets) {
    if ('token' in market && 'depositApy' in market) {
      console.log(`${market.provider.name} - ${market.token?.symbol}`)
      console.log(`  APY: ${formatPercent(market.depositApy)}`)
      if ('totalDepositUsd' in market) {
        console.log(`  TVL: ${formatUsd((market as any).totalDepositUsd)}`)
      }
      console.log(`  Deposit: ${market.actions.deposit?.blinkUrl || 'N/A'}`)
      console.log()
    }
  }

  console.log('=== Best Borrow Rates ===\n')
  const borrowMarkets = await dialect.getBestBorrowRates(5)

  for (const market of borrowMarkets) {
    if ('token' in market && 'borrowApy' in market) {
      console.log(`${market.provider.name} - ${market.token?.symbol}`)
      console.log(`  Borrow APY: ${formatPercent((market as any).borrowApy)}`)
      if ('maxLtv' in market) {
        console.log(`  Max LTV: ${formatPercent((market as any).maxLtv)}`)
      }
      console.log()
    }
  }

  console.log('=== Kamino Loop Markets ===\n')
  const loopMarkets = await dialect.getKaminoLoopMarkets()

  for (const market of loopMarkets.slice(0, 5)) {
    if ('tokenA' in market && 'tokenB' in market) {
      console.log(`${market.tokenA?.symbol} / ${market.tokenB?.symbol}`)
      if ('depositApy' in market) {
        console.log(`  Net APY: ${formatPercent(market.depositApy)}`)
      }
      if ('maxLeverage' in market) {
        console.log(`  Max Leverage: ${(market as any).maxLeverage.toFixed(2)}x`)
      }
      console.log()
    }
  }
}

main().catch(console.error)
