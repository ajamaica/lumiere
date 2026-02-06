#!/usr/bin/env npx ts-node
/**
 * Discover working Solana Actions endpoints from the Dialect registry
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REGISTRY_URL = 'https://actions-registry.dial.to/all'
const OUTPUT_FILE = path.join(__dirname, '../src/data/endpoints.json')

// Key DeFi protocols to prioritize
const PRIORITY_PROTOCOLS = [
  'kamino',
  'jupiter',
  'meteora',
  'raydium',
  'orca',
  'marginfi',
  'drift',
  'sanctum',
  'jito',
  'tensor',
  'lulo',
  'helius',
  'bonk',
  'phantom',
  'realms',
  'defituna',
  'deficarrot',
]

interface RegistryEntry {
  host: string
  state: 'trusted' | 'malicious'
}

interface ActionMetadata {
  title?: string
  description?: string
  icon?: string
  label?: string
  links?: {
    actions?: Array<{
      type: string
      href: string
      label: string
      parameters?: Array<{
        name: string
        type: string
        label?: string
        required?: boolean
      }>
    }>
  }
}

interface ActionsJson {
  rules?: Array<{
    pathPattern: string
    apiPath: string
  }>
}

interface DiscoveredEndpoint {
  host: string
  protocol: string
  actionsJson?: ActionsJson
  endpoints: Array<{
    path: string
    method: 'GET' | 'POST'
    metadata?: ActionMetadata
    working: boolean
    error?: string
  }>
  lastChecked: string
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SolanaBlinksSkill/1.0',
        ...options.headers,
      },
    })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchRegistry(): Promise<RegistryEntry[]> {
  console.log('Fetching registry from', REGISTRY_URL)
  const response = await fetchWithTimeout(REGISTRY_URL)
  const data = (await response.json()) as { actions: RegistryEntry[] }
  return data.actions.filter((a) => a.state === 'trusted')
}

function identifyProtocol(host: string): string | null {
  const hostLower = host.toLowerCase()
  for (const protocol of PRIORITY_PROTOCOLS) {
    if (hostLower.includes(protocol)) {
      return protocol
    }
  }
  // Check for dial.to subdomains
  if (hostLower.endsWith('.dial.to')) {
    return hostLower.replace('.dial.to', '')
  }
  return null
}

async function probeActionsJson(host: string): Promise<ActionsJson | null> {
  try {
    const response = await fetchWithTimeout(`https://${host}/actions.json`)
    if (response.ok) {
      return (await response.json()) as ActionsJson
    }
  } catch (e) {
    // Ignore errors
  }
  return null
}

async function probeEndpoint(
  url: string,
): Promise<{ working: boolean; metadata?: ActionMetadata; error?: string }> {
  try {
    const response = await fetchWithTimeout(url)
    if (response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as ActionMetadata
        // Check if it looks like an Actions response
        if (data.title || data.links?.actions) {
          return { working: true, metadata: data }
        }
      }
    }
    return { working: false, error: `HTTP ${response.status}` }
  } catch (e) {
    return { working: false, error: String(e) }
  }
}

// Common endpoint patterns to probe
const COMMON_PATHS = [
  '/',
  '/api',
  '/api/actions',
  '/api/v0',
  '/api/v1',
  '/stake',
  '/swap',
  '/deposit',
  '/withdraw',
  '/lend',
  '/borrow',
]

async function discoverEndpoints(host: string, protocol: string): Promise<DiscoveredEndpoint> {
  const result: DiscoveredEndpoint = {
    host,
    protocol,
    endpoints: [],
    lastChecked: new Date().toISOString(),
  }

  // Try actions.json first
  const actionsJson = await probeActionsJson(host)
  if (actionsJson) {
    result.actionsJson = actionsJson

    // Probe paths from actions.json rules
    for (const rule of actionsJson.rules || []) {
      const apiPath = rule.apiPath.replace(/\*\*/g, '').replace(/\*/g, '')
      if (apiPath.startsWith('http')) {
        // External URL
        const probe = await probeEndpoint(apiPath)
        result.endpoints.push({
          path: apiPath,
          method: 'GET',
          ...probe,
        })
      } else {
        // Relative path
        const url = `https://${host}${apiPath}`
        const probe = await probeEndpoint(url)
        result.endpoints.push({
          path: apiPath,
          method: 'GET',
          ...probe,
        })
      }
    }
  }

  // Probe common paths
  for (const commonPath of COMMON_PATHS) {
    const url = `https://${host}${commonPath}`
    const probe = await probeEndpoint(url)
    if (probe.working) {
      result.endpoints.push({
        path: commonPath,
        method: 'GET',
        ...probe,
      })
    }
  }

  return result
}

async function main() {
  console.log('🔍 Discovering Solana Actions endpoints...\n')

  // Fetch registry
  const registry = await fetchRegistry()
  console.log(`Found ${registry.length} trusted hosts\n`)

  // Filter for priority protocols
  const priorityHosts = registry.filter((entry) => {
    const protocol = identifyProtocol(entry.host)
    return protocol !== null
  })

  console.log(`Filtered to ${priorityHosts.length} priority DeFi hosts\n`)

  const discovered: DiscoveredEndpoint[] = []

  // Probe each host
  for (const entry of priorityHosts) {
    const protocol = identifyProtocol(entry.host)!
    console.log(`Probing ${entry.host} (${protocol})...`)

    try {
      const result = await discoverEndpoints(entry.host, protocol)
      const workingCount = result.endpoints.filter((e) => e.working).length
      console.log(`  → Found ${workingCount} working endpoints`)

      if (workingCount > 0 || result.actionsJson) {
        discovered.push(result)
      }
    } catch (e) {
      console.log(`  → Error: ${e}`)
    }
  }

  // Save results
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(discovered, null, 2))
  console.log(`\n✅ Saved ${discovered.length} endpoints to ${OUTPUT_FILE}`)

  // Print summary
  console.log('\n📊 Summary by protocol:')
  const byProtocol = new Map<string, number>()
  for (const d of discovered) {
    byProtocol.set(d.protocol, (byProtocol.get(d.protocol) || 0) + 1)
  }
  for (const [protocol, count] of byProtocol.entries()) {
    console.log(`  ${protocol}: ${count} hosts`)
  }
}

main().catch(console.error)
