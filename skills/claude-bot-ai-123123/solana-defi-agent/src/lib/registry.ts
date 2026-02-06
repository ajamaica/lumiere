/**
 * Dialect Actions Registry Client
 * Fetch and cache trusted action hosts from the official registry
 *
 * Registry URL: https://actions-registry.dial.to/all
 */

const REGISTRY_URL = 'https://actions-registry.dial.to/all'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface RegistryEntry {
  host: string
  state: 'trusted' | 'malicious'
}

interface RegistryResponse {
  actions: RegistryEntry[]
}

interface RegistryCache {
  trustedHosts: Set<string>
  maliciousHosts: Set<string>
  fetchedAt: number
}

let registryCache: RegistryCache | null = null

/**
 * Fetch the actions registry
 */
export async function fetchRegistry(): Promise<RegistryResponse> {
  const response = await fetch(REGISTRY_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SolanaBlinksSDK/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch registry: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<RegistryResponse>
}

/**
 * Get trusted hosts from the registry (with caching)
 */
export async function getTrustedHosts(forceRefresh = false): Promise<Set<string>> {
  const now = Date.now()

  // Return cached if valid
  if (registryCache && !forceRefresh && now - registryCache.fetchedAt < CACHE_TTL_MS) {
    return registryCache.trustedHosts
  }

  // Fetch fresh data
  const registry = await fetchRegistry()

  registryCache = {
    trustedHosts: new Set(
      registry.actions.filter((a) => a.state === 'trusted').map((a) => a.host.toLowerCase()),
    ),
    maliciousHosts: new Set(
      registry.actions.filter((a) => a.state === 'malicious').map((a) => a.host.toLowerCase()),
    ),
    fetchedAt: now,
  }

  return registryCache.trustedHosts
}

/**
 * Get malicious hosts from the registry (with caching)
 */
export async function getMaliciousHosts(forceRefresh = false): Promise<Set<string>> {
  const now = Date.now()

  if (registryCache && !forceRefresh && now - registryCache.fetchedAt < CACHE_TTL_MS) {
    return registryCache.maliciousHosts
  }

  await getTrustedHosts(forceRefresh)
  return registryCache!.maliciousHosts
}

/**
 * Check if a host is trusted
 */
export async function isHostTrusted(url: string): Promise<boolean> {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const trustedHosts = await getTrustedHosts()

    // Check exact match
    if (trustedHosts.has(hostname)) return true

    // Check if parent domain is trusted (e.g., api.example.com → example.com)
    const parts = hostname.split('.')
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.')
      if (trustedHosts.has(parent)) return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Check if a host is known malicious
 */
export async function isHostMalicious(url: string): Promise<boolean> {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const maliciousHosts = await getMaliciousHosts()
    return maliciousHosts.has(hostname)
  } catch {
    return false
  }
}

/**
 * Filter trusted hosts by protocol keyword
 */
export async function getProtocolHosts(protocol: string): Promise<string[]> {
  const trustedHosts = await getTrustedHosts()
  const keyword = protocol.toLowerCase()

  return Array.from(trustedHosts).filter((host) => host.includes(keyword))
}

/**
 * Get registry stats
 */
export async function getRegistryStats(): Promise<{
  trustedCount: number
  maliciousCount: number
  lastFetched: Date | null
}> {
  if (!registryCache) {
    await getTrustedHosts()
  }

  return {
    trustedCount: registryCache!.trustedHosts.size,
    maliciousCount: registryCache!.maliciousHosts.size,
    lastFetched: registryCache ? new Date(registryCache.fetchedAt) : null,
  }
}

/**
 * Clear the registry cache
 */
export function clearRegistryCache(): void {
  registryCache = null
}

export default {
  fetchRegistry,
  getTrustedHosts,
  getMaliciousHosts,
  isHostTrusted,
  isHostMalicious,
  getProtocolHosts,
  getRegistryStats,
  clearRegistryCache,
}
