/**
 * TypeScript wrapper for the AppleShortcuts native Expo module.
 *
 * The native module is only available on iOS 16+. All public functions
 * gracefully return no-ops / safe defaults on unsupported platforms.
 */

interface AppleShortcutsNativeModule {
  isAvailable(): boolean
  syncTriggers(triggersJson: string): Promise<void>
  consumePendingTrigger(): string | null
  addListener(eventName: string): void
  removeListeners(count: number): void
}

interface ShortcutTriggerEvent {
  slug: string
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
  const subscription = emitter.addListener(
    'onShortcutTrigger',
    (event: ShortcutTriggerEvent) => {
      if (event.slug) {
        callback(event.slug)
      }
    },
  )

  return () => subscription.remove()
}
