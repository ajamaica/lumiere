/**
 * Gateway discovery service.
 *
 * OpenClaw gateways advertise `_openclaw-gw._tcp` via mDNS on the local
 * network.  When a zeroconf/Bonjour library is available we can scan for
 * these automatically.  For now the module exposes the interface so the UI
 * can list discovered gateways alongside manually-entered URLs.
 */

export interface DiscoveredGateway {
  name: string
  host: string
  port: number
  url: string
}

export type DiscoveryListener = (gateways: DiscoveredGateway[]) => void

const GATEWAY_SERVICE_TYPE = '_openclaw-gw._tcp.'
const DEFAULT_PORT = 18789

let listeners: DiscoveryListener[] = []
let discovered: DiscoveredGateway[] = []
let scanning = false

/**
 * Start scanning for gateways on the local network.
 *
 * This is a no-op until a zeroconf library (e.g. react-native-zeroconf) is
 * wired in.  The scan result is exposed so the onboarding UI can offer
 * auto-discovered gateways alongside a manual URL input.
 */
export function startDiscovery(): void {
  if (scanning) return
  scanning = true
  console.log(`[discovery] scanning for ${GATEWAY_SERVICE_TYPE} (mDNS not yet wired)`)
}

export function stopDiscovery(): void {
  scanning = false
  discovered = []
}

export function isScanning(): boolean {
  return scanning
}

export function getDiscovered(): DiscoveredGateway[] {
  return discovered
}

export function onDiscovery(listener: DiscoveryListener): () => void {
  listeners.push(listener)
  // Immediately emit current results
  listener(discovered)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

/**
 * Build a WebSocket URL from a host and optional port.
 * Handles common user inputs: bare IP, hostname, full URL, etc.
 */
export function normalizeGatewayUrl(input: string): string {
  let url = input.trim()

  // Already a full ws(s) URL
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url
  }

  // HTTPS → WSS, HTTP → WS
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://')
  }
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://')
  }

  // Bare host(:port) — default to ws:// with default port
  if (!url.includes('://')) {
    const hasPort = /:\d+$/.test(url)
    return `ws://${url}${hasPort ? '' : `:${DEFAULT_PORT}`}`
  }

  return url
}

// Internal: called by the zeroconf integration (when wired)
export function _addDiscovered(gateway: DiscoveredGateway): void {
  const exists = discovered.some((g) => g.host === gateway.host && g.port === gateway.port)
  if (!exists) {
    discovered = [...discovered, gateway]
    listeners.forEach((l) => l(discovered))
  }
}

export function _removeDiscovered(host: string, port: number): void {
  discovered = discovered.filter((g) => !(g.host === host && g.port === port))
  listeners.forEach((l) => l(discovered))
}
