#!/usr/bin/env npx tsx
/**
 * Test all Dialect SBL endpoints
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
}

const endpoints = [
  // MarginFi
  { name: 'MarginFi SOL deposit', url: 'https://marginfi.dial.to/api/v0/lend/SOL/deposit' },
  { name: 'MarginFi USDC deposit', url: 'https://marginfi.dial.to/api/v0/lend/USDC/deposit' },

  // Lulo
  { name: 'Lulo USDC protected', url: 'https://lulo.dial.to/api/v0/deposit/USDC/protected' },
  { name: 'Lulo USDC boosted', url: 'https://lulo.dial.to/api/v0/deposit/USDC/boosted' },

  // Orca
  {
    name: 'Orca SOL-USDC position',
    url: `https://orca.dial.to/api/v0/pools/${TOKENS.SOL}/${TOKENS.USDC}/open-position`,
  },

  // Meteora
  {
    name: 'Meteora launch token',
    url: 'https://meteora.dial.to/api/v0/bonding-curve/launch-token',
  },

  // Jupiter
  { name: 'Jupiter SOL-USDC swap', url: 'https://worker.jup.ag/blinks/swap/SOL-USDC' },

  // Raydium
  { name: 'Raydium swap info', url: 'https://share.raydium.io/dialect/actions/swap/info' },

  // Sanctum (needs browser UA)
  { name: 'Sanctum SOL-INF trade', url: 'https://sanctum.dial.to/trade/SOL-INF', needsUA: true },

  // Jito
  { name: 'Jito stake', url: 'https://jito.dial.to/stake' },

  // Helius
  { name: 'Helius stake', url: 'https://helius.dial.to/stake' },
]

async function testEndpoint(
  name: string,
  url: string,
  needsUA = false,
): Promise<{ name: string; status: string; title?: string; error?: string }> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (needsUA) headers['User-Agent'] = UA

    const res = await fetch(url, { headers })

    if (!res.ok) {
      const text = await res.text()
      return { name, status: `❌ ${res.status}`, error: text.slice(0, 100) }
    }

    const data = await res.json()
    return {
      name,
      status: '✅ OK',
      title: data.title || data.label || '(no title)',
    }
  } catch (err) {
    return { name, status: '❌ Error', error: String(err).slice(0, 100) }
  }
}

async function main() {
  console.log('Testing Dialect SBL Endpoints...\n')
  console.log('='.repeat(80))

  for (const ep of endpoints) {
    const result = await testEndpoint(ep.name, ep.url, ep.needsUA)
    console.log(`${result.status.padEnd(10)} ${result.name}`)
    if (result.title) console.log(`           → "${result.title}"`)
    if (result.error) console.log(`           → ${result.error}`)
  }

  console.log('='.repeat(80))
  console.log('\nDone!')
}

main().catch(console.error)
