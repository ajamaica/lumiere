/**
 * TypeScript wrapper for the AppleShortcuts native Expo module.
 *
 * The native module is only available on iOS 16+. All public functions
 * gracefully return no-ops / safe defaults on unsupported platforms.
 */

interface AppleShortcutsNativeModule {
  isAvailable(): boolean
  syncTriggers(triggersJson: string): Promise<void>
  syncServers(serversJson: string): Promise<void>
  consumePendingTrigger(): string | null
  consumePendingActivity(): string | null
  donateOpenChatActivity(
    serverId: string,
    serverName: string,
    sessionKey: string,
    sessionName: string,
  ): Promise<void>
  deleteAllDonatedActivities(): Promise<void>
  addListener(eventName: string): void
  removeListeners(count: number): void
}

interface ShortcutTriggerEvent {
  slug: string
}

export interface SiriActivityEvent {
  serverId?: string
  serverName?: string
  sessionKey?: string
  newSession?: string
}

let nativeModule: AppleShortcutsNativeModule | null = null

function getModule(): AppleShortcutsNativeModule | null {
  if (nativeModule) return nativeModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('AppleShortcuts') as AppleShortcutsNativeModule
    return nativeModule
  } catch {
    return null
  }
}

function createEventEmitter(mod: AppleShortcutsNativeModule) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('expo')
  return new EventEmitter(mod)
}

/**
 * Whether Apple Shortcuts integration is available (iOS 16+).
 * Returns false on Android or older iOS versions.
 */
export function isAvailable(): boolean {
  try {
    return getModule()?.isAvailable() ?? false
  } catch {
    return false
  }
}

/**
 * Sync the current list of triggers to the native module so they appear
 * as options in the Shortcuts app.
 *
 * @param triggers Array of { id, name, serverName } objects.
 */
export async function syncTriggers(
  triggers: Array<{ id: string; name: string; serverName: string }>,
): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.syncTriggers(JSON.stringify(triggers))
}

/**
 * Sync the current list of servers to the native module so they appear
 * as options in Siri Suggestions and the Shortcuts app.
 *
 * @param servers Array of { id, name, providerType } objects.
 */
export async function syncServers(
  servers: Array<{ id: string; name: string; providerType: string }>,
): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.syncServers(JSON.stringify(servers))
}

/**
 * Check for a trigger slug that was set by a shortcut execution before
 * the JS bridge was ready (cold start). Returns the slug and clears it,
 * or null if none is pending.
 */
export function consumePendingTrigger(): string | null {
  try {
    return getModule()?.consumePendingTrigger() ?? null
  } catch {
    return null
  }
}

/**
 * Check for a pending Siri Suggestion activity from a cold start.
 * Returns the parsed activity data or null.
 */
export function consumePendingActivity(): SiriActivityEvent | null {
  try {
    const json = getModule()?.consumePendingActivity() ?? null
    if (!json) return null
    return JSON.parse(json) as SiriActivityEvent
  } catch {
    return null
  }
}

/**
 * Donate an "open chat" activity to Siri so it can learn usage patterns
 * and suggest the action in Spotlight, the lock screen, and Siri Suggestions.
 */
export async function donateOpenChatActivity(
  serverId: string,
  serverName: string,
  sessionKey: string,
  sessionName: string,
): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.donateOpenChatActivity(serverId, serverName, sessionKey, sessionName)
}

/**
 * Remove all donated Siri Suggestions activities.
 */
export async function deleteAllDonatedActivities(): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.deleteAllDonatedActivities()
}

/**
 * Listen for shortcut trigger events. The callback fires when a shortcut
 * executes a trigger while the app is running (foreground or returning
 * from background).
 *
 * @returns Cleanup function that removes the listener.
 */
export function addTriggerListener(callback: (slug: string) => void): () => void {
  const mod = getModule()
  if (!mod) return () => {}

  const emitter = createEventEmitter(mod)
  const subscription = emitter.addListener('onShortcutTrigger', (event: ShortcutTriggerEvent) => {
    if (event.slug) {
      callback(event.slug)
    }
  })

  return () => subscription.remove()
}

/**
 * Listen for Siri Suggestion activity events (e.g. user tapped "Open Chat"
 * from Siri Suggestions or Spotlight).
 *
 * @returns Cleanup function that removes the listener.
 */
export function addActivityListener(callback: (event: SiriActivityEvent) => void): () => void {
  const mod = getModule()
  if (!mod) return () => {}

  const emitter = createEventEmitter(mod)
  const subscription = emitter.addListener('onContinueActivity', (event: SiriActivityEvent) => {
    callback(event)
  })

  return () => subscription.remove()
}
