interface WatchConnectivityNativeModule {
  isWatchAppInstalled(): boolean
  syncServers(serversJson: string, currentServerId: string): Promise<void>
}

let nativeModule: WatchConnectivityNativeModule | null = null

function getModule(): WatchConnectivityNativeModule | null {
  if (nativeModule) return nativeModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('WatchConnectivity') as WatchConnectivityNativeModule
    return nativeModule
  } catch {
    return null
  }
}

/** Returns true if the paired Apple Watch has the companion app installed. */
export function isWatchAppInstalled(): boolean {
  try {
    return getModule()?.isWatchAppInstalled() ?? false
  } catch {
    return false
  }
}

/**
 * Push the current server list and active server ID to the Apple Watch
 * via WCSession.updateApplicationContext.
 */
export async function syncServers(serversJson: string, currentServerId: string): Promise<void> {
  try {
    const mod = getModule()
    if (!mod) return
    await mod.syncServers(serversJson, currentServerId)
  } catch {
    // Watch not reachable or WCSession inactive — non-fatal.
  }
}
