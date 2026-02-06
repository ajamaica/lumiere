/**
 * Endpoint Discovery Tests
 * Tries multiple path patterns to discover working endpoints
 *
 * Run: npx vitest run tests/discover-paths.test.ts
 */

import { describe, expect, it } from 'vitest'

const TIMEOUT = 10000

// Common path patterns to try
const PATH_PATTERNS = [
  '/',
  '/api',
  '/api/v0',
  '/api/v1',
  '/api/actions',
  '/api/blinks',
  '/swap',
  '/stake',
  '/deposit',
  '/lend',
  '/borrow',
]

interface DiscoveryResult {
  host: string
  workingPaths: string[]
  actionsJson: any | null
  error?: string
}

async function discoverEndpoints(host: string): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    host,
    workingPaths: [],
    actionsJson: null,
  }

  // Try actions.json first
  try {
    const response = await fetch(`https://${host}/actions.json`, {
      headers: { Accept: 'application/json' },
    })
    if (response.ok) {
      result.actionsJson = await response.json()
    }
  } catch (e) {
    // Ignore
  }

  // Try common paths
  for (const path of PATH_PATTERNS) {
    try {
      const response = await fetch(`https://${host}${path}`, {
        headers: { Accept: 'application/json' },
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await response.json()
          // Check if it looks like an Actions response
          if (data.title || data.label || data.links?.actions) {
            result.workingPaths.push(path)
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  return result
}

describe('Endpoint Discovery', () => {
  const protocols = [
    { name: 'Jupiter', host: 'jupiter.dial.to' },
    { name: 'Orca', host: 'orca.dial.to' },
    { name: 'MarginFi', host: 'marginfi.dial.to' },
    { name: 'Lulo', host: 'lulo.dial.to' },
    { name: 'Helius', host: 'helius.dial.to' },
    { name: 'Bonk', host: 'bonk.dial.to' },
    { name: 'Realms', host: 'realms.dial.to' },
    { name: 'Phantom', host: 'phantom.dial.to' },
  ]

  for (const { name, host } of protocols) {
    it(
      `should discover ${name} endpoints`,
      async () => {
        console.log(`\n🔍 Discovering ${name} (${host})...`)

        const result = await discoverEndpoints(host)

        if (result.actionsJson) {
          console.log(
            `  📋 actions.json: ${JSON.stringify(result.actionsJson.rules?.map((r: any) => r.pathPattern) || 'no rules')}`,
          )
        }

        if (result.workingPaths.length > 0) {
          console.log(`  ✅ Working paths: ${result.workingPaths.join(', ')}`)
        } else {
          console.log(`  ❌ No working action paths found`)
        }

        // This test always passes - it's for discovery
        expect(true).toBe(true)
      },
      TIMEOUT * 2,
    )
  }

  it(
    'should try specific paths for Jupiter',
    async () => {
      const host = 'jupiter.dial.to'
      const paths = [
        '/swap',
        '/api/swap',
        '/api/v0/swap',
        '/api/v1/swap',
        '/api/actions/swap',
        '/perps',
        '/api/perps',
        '/api/v0/perps/earn/deposit',
      ]

      console.log('\n🔍 Jupiter specific path discovery...')

      for (const path of paths) {
        try {
          const response = await fetch(`https://${host}${path}`, {
            headers: { Accept: 'application/json' },
          })
          const status = response.status
          let hasActions = false

          if (response.ok) {
            const contentType = response.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const data = await response.json()
              hasActions = !!(data.title || data.links?.actions)
            }
          }

          console.log(`  ${path}: ${status} ${hasActions ? '✅ HAS ACTIONS' : ''}`)
        } catch (e: any) {
          console.log(`  ${path}: ERROR - ${e.message}`)
        }
      }
    },
    TIMEOUT * 3,
  )

  it(
    'should try specific paths for Meteora',
    async () => {
      const host = 'meteora.dial.to'
      const paths = [
        '/api/bonding-curve',
        '/api/bonding-curve/launch',
        '/api/bonding-curve/launch-token',
        '/api/dlmm',
        '/api/dlmm/add',
        '/api/dlmm/remove',
        '/bonding-curve',
        '/dlmm',
      ]

      console.log('\n🔍 Meteora specific path discovery...')

      for (const path of paths) {
        try {
          const response = await fetch(`https://${host}${path}`, {
            headers: { Accept: 'application/json' },
          })
          const status = response.status
          let hasActions = false

          if (response.ok) {
            const contentType = response.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const data = await response.json()
              hasActions = !!(data.title || data.links?.actions)
            }
          }

          console.log(`  ${path}: ${status} ${hasActions ? '✅ HAS ACTIONS' : ''}`)
        } catch (e: any) {
          console.log(`  ${path}: ERROR - ${e.message}`)
        }
      }
    },
    TIMEOUT * 3,
  )
})
