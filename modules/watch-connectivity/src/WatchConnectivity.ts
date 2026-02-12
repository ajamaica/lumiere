/**
 * TypeScript wrapper for the WatchConnectivity native Expo module.
 *
 * The native module is only available on iOS with a paired Apple Watch.
 * All public functions gracefully return no-ops / safe defaults on
 * unsupported platforms.
 */

interface WatchConnectivityNativeModule {
  isWatchPaired(): boolean
  isWatchAppInstalled(): boolean
  syncTriggers(triggersJson: string): Promise<void>
  sendResponseToWatch(slug: string, response: string): Promise<void>
  addListener(eventName: string): void
  removeListeners(count: number): void
}

interface WatchTriggerRequestEvent {
  slug: string
}

interface WatchVoiceMessageEvent {
  text: string
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

function createEventEmitter(mod: WatchConnectivityNativeModule) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('expo')
  return new EventEmitter(mod)
}

/**
 * Whether an Apple Watch is paired with this iPhone.
 * Returns false on Android/web or when no Watch is paired.
 */
export function isWatchPaired(): boolean {
  try {
    return getModule()?.isWatchPaired() ?? false
  } catch {
    return false
  }
}

/**
 * Whether the Lumiere Watch app is installed on the paired Watch.
 * Returns false on Android/web or when the app is not installed.
 */
export function isWatchAppInstalled(): boolean {
  try {
    return getModule()?.isWatchAppInstalled() ?? false
  } catch {
    return false
  }
}

/**
 * Sync the current list of triggers to the Watch via application context.
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
 * Send an AI response back to the Watch for display.
 *
 * @param slug The trigger slug that was requested.
 * @param response The full AI response text.
 */
export async function sendResponseToWatch(slug: string, response: string): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.sendResponseToWatch(slug, response)
}

/**
 * Listen for trigger request events from the Watch. The callback fires
 * when the user taps a trigger on the Watch.
 *
 * @returns Cleanup function that removes the listener.
 */
export function addTriggerRequestListener(callback: (slug: string) => void): () => void {
  const mod = getModule()
  if (!mod) return () => {}

  const emitter = createEventEmitter(mod)
  const subscription = emitter.addListener(
    'onWatchTriggerRequest',
    (event: WatchTriggerRequestEvent) => {
      if (event.slug) {
        callback(event.slug)
      }
    },
  )

  return () => subscription.remove()
}

/**
 * Listen for voice dictation messages from the Watch. The callback fires
 * when the user dictates a message on the Watch.
 *
 * @returns Cleanup function that removes the listener.
 */
export function addVoiceMessageListener(callback: (text: string) => void): () => void {
  const mod = getModule()
  if (!mod) return () => {}

  const emitter = createEventEmitter(mod)
  const subscription = emitter.addListener(
    'onWatchVoiceMessage',
    (event: WatchVoiceMessageEvent) => {
      if (event.text) {
        callback(event.text)
      }
    },
  )

  return () => subscription.remove()
}
