/**
 * Protocol Endpoint Tests
 * Tests all protocol action endpoints to verify they're working
 *
 * Run: npx vitest tests/protocols.test.ts
 * Run single: npx vitest tests/protocols.test.ts -t "kamino"
 */

import { beforeAll, describe, expect, it } from 'vitest'

import {
  ActionsClient,
  getRegistryStats,
  getTrustedHosts,
  PROTOCOL_ACTION_ENDPOINTS,
} from '../src/index.js'

// Test wallet address (doesn't need funds for GET requests)
const TEST_WALLET = '6dDEgPPDca64boRu7mhpboQzCPJsZqzHyWvHDbUz9ZVF'

// Timeout for network requests
const TIMEOUT = 15000

// Track results for summary
const results: Array<{
  protocol: string
  endpoint: string
  status: 'pass' | 'fail' | 'skip'
  error?: string
  metadata?: { title?: string; actions?: number }
}> = []

describe('Registry', () => {
  it(
    'should fetch trusted hosts from registry',
    async () => {
      const stats = await getRegistryStats()
      expect(stats.trustedCount).toBeGreaterThan(900)
      expect(stats.maliciousCount).toBeGreaterThan(0)
      console.log(`✅ Registry: ${stats.trustedCount} trusted, ${stats.maliciousCount} malicious`)
    },
    TIMEOUT,
  )
})

describe('Protocol Endpoints', () => {
  let client: ActionsClient

  beforeAll(() => {
    client = new ActionsClient({ timeout: TIMEOUT })
  })

  // ============================================
  // KAMINO - Confirmed Working
  // ============================================
  describe('Kamino', () => {
    const BASE = 'https://kamino.dial.to'

    it(
      'should GET lend deposit metadata',
      async () => {
        const url = `${BASE}/api/v0/lend/usdg-prime/deposit`
        try {
          const meta = await client.getAction(url)
          expect(meta.title).toBeDefined()
          expect(meta.links?.actions).toBeDefined()
          results.push({
            protocol: 'kamino',
            endpoint: 'lend/deposit',
            status: 'pass',
            metadata: { title: meta.title, actions: meta.links?.actions?.length },
          })
          console.log(
            `✅ Kamino lend/deposit: "${meta.title}" (${meta.links?.actions?.length} actions)`,
          )
        } catch (e) {
          results.push({
            protocol: 'kamino',
            endpoint: 'lend/deposit',
            status: 'fail',
            error: String(e),
          })
          throw e
        }
      },
      TIMEOUT,
    )

    it(
      'should GET lend withdraw metadata',
      async () => {
        const url = `${BASE}/api/v0/lend/usdg-prime/withdraw`
        try {
          const meta = await client.getAction(url)
          expect(meta.title).toBeDefined()
          results.push({
            protocol: 'kamino',
            endpoint: 'lend/withdraw',
            status: 'pass',
            metadata: { title: meta.title, actions: meta.links?.actions?.length },
          })
          console.log(`✅ Kamino lend/withdraw: "${meta.title}"`)
        } catch (e) {
          results.push({
            protocol: 'kamino',
            endpoint: 'lend/withdraw',
            status: 'fail',
            error: String(e),
          })
          throw e
        }
      },
      TIMEOUT,
    )

    it(
      'should POST and get transaction (will fail without tokens)',
      async () => {
        const url = `${BASE}/api/v0/lend/usdg-prime/deposit?amount=1`
        try {
          const tx = await client.postAction(url, TEST_WALLET)
          // If we get here, the endpoint works (even if tx fails due to no tokens)
          expect(tx.transaction || tx.message).toBeDefined()
          results.push({ protocol: 'kamino', endpoint: 'lend/deposit POST', status: 'pass' })
          console.log(`✅ Kamino POST works (got transaction or message)`)
        } catch (e: any) {
          // 422 = endpoint works but wallet has no tokens (expected)
          if (e.statusCode === 422) {
            results.push({ protocol: 'kamino', endpoint: 'lend/deposit POST', status: 'pass' })
            console.log(`✅ Kamino POST works (422 = no tokens, expected)`)
          } else {
            results.push({
              protocol: 'kamino',
              endpoint: 'lend/deposit POST',
              status: 'fail',
              error: String(e),
            })
            throw e
          }
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // JUPITER - CONFIRMED WORKING
  // Pattern: /swap/{inputMint}-{outputMint}
  // ============================================
  describe('Jupiter', () => {
    const BASE = 'https://jupiter.dial.to'
    const SOL = 'So11111111111111111111111111111111111111112'
    const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

    it(
      'should GET swap metadata with token mints',
      async () => {
        const url = `${BASE}/swap/${SOL}-${USDC}`
        try {
          const meta = await client.getAction(url)
          expect(meta.title).toBeDefined()
          expect(meta.links?.actions).toBeDefined()
          results.push({
            protocol: 'jupiter',
            endpoint: 'swap/{inputMint}-{outputMint}',
            status: 'pass',
            metadata: { title: meta.title, actions: meta.links?.actions?.length },
          })
          console.log(`✅ Jupiter swap: "${meta.title}" (${meta.links?.actions?.length} actions)`)
        } catch (e: any) {
          results.push({ protocol: 'jupiter', endpoint: 'swap', status: 'fail', error: e.message })
          console.log(`❌ Jupiter swap: ${e.message}`)
        }
      },
      TIMEOUT,
    )

    it(
      'should GET swap with amount',
      async () => {
        const url = `${BASE}/swap/${SOL}-${USDC}/1`
        try {
          const meta = await client.getAction(url)
          expect(meta.title).toContain('1 SOL')
          results.push({
            protocol: 'jupiter',
            endpoint: 'swap/{inputMint}-{outputMint}/{amount}',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Jupiter swap w/amount: "${meta.title}"`)
        } catch (e: any) {
          results.push({
            protocol: 'jupiter',
            endpoint: 'swap/amount',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Jupiter swap w/amount: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // METEORA
  // ============================================
  describe('Meteora', () => {
    const BASE = 'https://meteora.dial.to'

    it(
      'should have actions.json',
      async () => {
        try {
          const response = await fetch(`${BASE}/actions.json`)
          const data = await response.json()
          expect(data.rules).toBeDefined()
          results.push({ protocol: 'meteora', endpoint: 'actions.json', status: 'pass' })
          console.log(`✅ Meteora actions.json: ${data.rules?.length} rules`)
        } catch (e: any) {
          results.push({
            protocol: 'meteora',
            endpoint: 'actions.json',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Meteora actions.json: ${e.message}`)
        }
      },
      TIMEOUT,
    )

    it(
      'should GET bonding-curve launch',
      async () => {
        // Note: This returns HTML, need to find correct API path
        const url = `${BASE}/api/bonding-curve/launch`
        try {
          const meta = await client.getAction(url)
          results.push({
            protocol: 'meteora',
            endpoint: 'bonding-curve/launch',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Meteora bonding-curve: "${meta.title}"`)
        } catch (e: any) {
          results.push({
            protocol: 'meteora',
            endpoint: 'bonding-curve/launch',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Meteora bonding-curve: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // RAYDIUM
  // ============================================
  describe('Raydium', () => {
    const BASE = 'https://share.raydium.io'

    it(
      'should have actions.json or root endpoint',
      async () => {
        try {
          const response = await fetch(`${BASE}/actions.json`)
          if (response.ok) {
            const data = await response.json()
            results.push({ protocol: 'raydium', endpoint: 'actions.json', status: 'pass' })
            console.log(`✅ Raydium actions.json found`)
          } else {
            results.push({
              protocol: 'raydium',
              endpoint: 'actions.json',
              status: 'fail',
              error: `${response.status}`,
            })
            console.log(`❌ Raydium actions.json: ${response.status}`)
          }
        } catch (e: any) {
          results.push({
            protocol: 'raydium',
            endpoint: 'actions.json',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Raydium: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // ORCA
  // ============================================
  describe('Orca', () => {
    const BASE = 'https://orca.dial.to'

    it(
      'should GET root or swap endpoint',
      async () => {
        try {
          const meta = await client.getAction(`${BASE}/`)
          results.push({
            protocol: 'orca',
            endpoint: '/',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Orca: "${meta.title}"`)
        } catch (e: any) {
          results.push({ protocol: 'orca', endpoint: '/', status: 'fail', error: e.message })
          console.log(`❌ Orca: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // MARGINFI
  // ============================================
  describe('MarginFi', () => {
    const BASE = 'https://marginfi.dial.to'

    it(
      'should GET root or deposit endpoint',
      async () => {
        try {
          const meta = await client.getAction(`${BASE}/`)
          results.push({
            protocol: 'marginfi',
            endpoint: '/',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ MarginFi: "${meta.title}"`)
        } catch (e: any) {
          results.push({ protocol: 'marginfi', endpoint: '/', status: 'fail', error: e.message })
          console.log(`❌ MarginFi: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // DRIFT
  // ============================================
  describe('Drift', () => {
    const BASE = 'https://app.drift.trade'

    it(
      'should have actions.json',
      async () => {
        try {
          const response = await fetch(`${BASE}/actions.json`)
          if (response.ok) {
            const data = await response.json()
            expect(data.rules).toBeDefined()
            results.push({ protocol: 'drift', endpoint: 'actions.json', status: 'pass' })
            console.log(`✅ Drift actions.json: ${data.rules?.length} rules`)
          } else {
            throw new Error(`${response.status}`)
          }
        } catch (e: any) {
          results.push({
            protocol: 'drift',
            endpoint: 'actions.json',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Drift actions.json: ${e.message}`)
        }
      },
      TIMEOUT,
    )

    it(
      'should GET deposit blink',
      async () => {
        const url = `${BASE}/api/blinks/deposit`
        try {
          const meta = await client.getAction(url)
          results.push({
            protocol: 'drift',
            endpoint: 'blinks/deposit',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Drift deposit: "${meta.title}"`)
        } catch (e: any) {
          results.push({
            protocol: 'drift',
            endpoint: 'blinks/deposit',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Drift deposit: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // LULO
  // ============================================
  describe('Lulo', () => {
    it(
      'should GET lulo.dial.to root',
      async () => {
        const BASE = 'https://lulo.dial.to'
        try {
          const meta = await client.getAction(`${BASE}/`)
          results.push({
            protocol: 'lulo',
            endpoint: '/',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Lulo: "${meta.title}"`)
        } catch (e: any) {
          results.push({ protocol: 'lulo', endpoint: '/', status: 'fail', error: e.message })
          console.log(`❌ Lulo: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // SANCTUM - Endpoint paths unknown (returns 404)
  // ============================================
  describe('Sanctum', () => {
    const BASE = 'https://sanctum.dial.to'

    it(
      'should GET stake endpoint (path unknown)',
      async () => {
        // Note: sanctum.dial.to returns 404 for all tested paths
        // The endpoint structure is not yet discovered
        try {
          const meta = await client.getAction(`${BASE}/stake`)
          results.push({
            protocol: 'sanctum',
            endpoint: 'stake',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Sanctum: "${meta.title}"`)
        } catch (e: any) {
          // 404 means path not found, not blocked
          results.push({ protocol: 'sanctum', endpoint: 'stake', status: 'fail', error: e.message })
          console.log(`❌ Sanctum: ${e.message} (endpoint path unknown)`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // JITO
  // ============================================
  describe('Jito', () => {
    it(
      'should have jito.network actions.json',
      async () => {
        try {
          const response = await fetch('https://jito.network/actions.json')
          if (response.ok) {
            const data = await response.json()
            expect(data.rules).toBeDefined()
            results.push({
              protocol: 'jito',
              endpoint: 'jito.network/actions.json',
              status: 'pass',
            })
            console.log(`✅ Jito actions.json: routes to ${data.rules?.[0]?.apiPath}`)
          } else {
            throw new Error(`${response.status}`)
          }
        } catch (e: any) {
          results.push({
            protocol: 'jito',
            endpoint: 'jito.network/actions.json',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Jito actions.json: ${e.message}`)
        }
      },
      TIMEOUT,
    )

    it(
      'should GET jito.dial.to stake',
      async () => {
        const BASE = 'https://jito.dial.to'
        try {
          const meta = await client.getAction(`${BASE}/stake`)
          results.push({
            protocol: 'jito',
            endpoint: 'stake',
            status: 'pass',
            metadata: { title: meta.title },
          })
          console.log(`✅ Jito stake: "${meta.title}"`)
        } catch (e: any) {
          if (e.message?.includes('403') || e.message?.includes('blocked')) {
            results.push({
              protocol: 'jito',
              endpoint: 'stake',
              status: 'skip',
              error: 'Cloudflare blocked',
            })
            console.log(`⏭️ Jito: Cloudflare blocked (expected from server IP)`)
          } else {
            results.push({ protocol: 'jito', endpoint: 'stake', status: 'fail', error: e.message })
            console.log(`❌ Jito: ${e.message}`)
          }
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // TENSOR
  // ============================================
  describe('Tensor', () => {
    it(
      'should have tensor.trade actions.json',
      async () => {
        try {
          const response = await fetch('https://tensor.trade/actions.json')
          if (response.ok) {
            const data = await response.json()
            expect(data.rules).toBeDefined()
            results.push({
              protocol: 'tensor',
              endpoint: 'tensor.trade/actions.json',
              status: 'pass',
            })
            console.log(`✅ Tensor actions.json: ${data.rules?.length} rules`)
          } else {
            throw new Error(`${response.status}`)
          }
        } catch (e: any) {
          results.push({
            protocol: 'tensor',
            endpoint: 'tensor.trade/actions.json',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Tensor actions.json: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // HELIUS - CONFIRMED WORKING at /stake
  // ============================================
  describe('Helius', () => {
    const BASE = 'https://helius.dial.to'

    it(
      'should GET /stake endpoint',
      async () => {
        try {
          const meta = await client.getAction(`${BASE}/stake`)
          expect(meta.title).toBeDefined()
          results.push({
            protocol: 'helius',
            endpoint: '/stake',
            status: 'pass',
            metadata: { title: meta.title, actions: meta.links?.actions?.length },
          })
          console.log(`✅ Helius: "${meta.title}" (${meta.links?.actions?.length} actions)`)
        } catch (e: any) {
          results.push({ protocol: 'helius', endpoint: '/stake', status: 'fail', error: e.message })
          console.log(`❌ Helius: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })

  // ============================================
  // MAGIC EDEN
  // ============================================
  describe('Magic Eden', () => {
    const BASE = 'https://api-mainnet.magiceden.dev'

    it(
      'should have accessible API',
      async () => {
        try {
          const response = await fetch(`${BASE}/v2/actions/buy`, {
            headers: { Accept: 'application/json' },
          })
          // Even 400/404 means the API is up
          results.push({
            protocol: 'magiceden',
            endpoint: 'v2/actions/buy',
            status: response.ok ? 'pass' : 'fail',
            error: response.ok ? undefined : `${response.status}`,
          })
          console.log(`${response.ok ? '✅' : '❌'} Magic Eden: ${response.status}`)
        } catch (e: any) {
          results.push({
            protocol: 'magiceden',
            endpoint: 'v2/actions/buy',
            status: 'fail',
            error: e.message,
          })
          console.log(`❌ Magic Eden: ${e.message}`)
        }
      },
      TIMEOUT,
    )
  })
})

// ============================================
// SUMMARY
// ============================================
describe('Summary', () => {
  it('should print results summary', () => {
    console.log('\n' + '='.repeat(60))
    console.log('PROTOCOL TEST SUMMARY')
    console.log('='.repeat(60))

    const passed = results.filter((r) => r.status === 'pass')
    const failed = results.filter((r) => r.status === 'fail')
    const skipped = results.filter((r) => r.status === 'skip')

    console.log(`\n✅ PASSED (${passed.length}):`)
    passed.forEach((r) => {
      console.log(
        `   ${r.protocol}/${r.endpoint}${r.metadata?.title ? ` - "${r.metadata.title}"` : ''}`,
      )
    })

    if (skipped.length > 0) {
      console.log(`\n⏭️ SKIPPED (${skipped.length}):`)
      skipped.forEach((r) => {
        console.log(`   ${r.protocol}/${r.endpoint} - ${r.error}`)
      })
    }

    if (failed.length > 0) {
      console.log(`\n❌ FAILED (${failed.length}):`)
      failed.forEach((r) => {
        console.log(`   ${r.protocol}/${r.endpoint} - ${r.error}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log(
      `Total: ${passed.length} passed, ${skipped.length} skipped, ${failed.length} failed`,
    )
    console.log('='.repeat(60) + '\n')

    // Don't fail the test, this is just a summary
    expect(true).toBe(true)
  })
})
