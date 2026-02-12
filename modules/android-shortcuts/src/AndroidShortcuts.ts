/**
 * TypeScript wrapper for the AndroidShortcuts native Expo module.
 *
 * Provides static shortcuts (XML-defined), dynamic shortcuts
 * (runtime-managed), and pinned shortcuts (pushed to home screen).
 *
 * Only available on Android API 25+. All public functions gracefully
 * return no-ops / safe defaults on unsupported platforms.
 */

interface AndroidShortcutsNativeModule {
  isAvailable(): boolean
  isPinningSupported(): boolean
  requestPinShortcut(id: string, label: string, longLabel: string, uri: string): Promise<void>
  setDynamicShortcuts(shortcutsJson: string): Promise<void>
  removeAllDynamicShortcuts(): void
  updatePinnedShortcuts(shortcutsJson: string): Promise<void>
  getPinnedShortcutIds(): Promise<string[]>
  disableShortcuts(ids: string[], message: string): Promise<void>
}

interface DynamicShortcut {
  id: string
  shortLabel: string
  longLabel?: string
  uri: string
}

let nativeModule: AndroidShortcutsNativeModule | null = null

function getModule(): AndroidShortcutsNativeModule | null {
  if (nativeModule) return nativeModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('AndroidShortcuts') as AndroidShortcutsNativeModule
    return nativeModule
  } catch {
    return null
  }
}

/**
 * Whether the Android Shortcuts API is available (API 25+).
 * Returns false on iOS, web, or older Android versions.
 */
export function isAvailable(): boolean {
  try {
    return getModule()?.isAvailable() ?? false
  } catch {
    return false
  }
}

/**
 * Whether the device supports pinning shortcuts to the home screen.
 * Returns false on iOS, web, or devices that don't support pinning.
 */
export function isPinningSupported(): boolean {
  try {
    return getModule()?.isPinningSupported() ?? false
  } catch {
    return false
  }
}

/**
 * Request to pin a shortcut to the Android home screen.
 * The system shows a confirmation dialog to the user.
 *
 * @param id        Unique shortcut ID (e.g. trigger slug)
 * @param label     Short label displayed under the icon
 * @param longLabel Longer descriptive label
 * @param uri       Deep link URI (e.g. lumiere://trigger/autotrigger/abc12345)
 */
export async function requestPinShortcut(
  id: string,
  label: string,
  longLabel: string,
  uri: string,
): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.requestPinShortcut(id, label, longLabel, uri)
}

/**
 * Set dynamic shortcuts that appear alongside static shortcuts
 * when long-pressing the app icon.
 *
 * @param shortcuts Array of shortcut definitions
 */
export async function setDynamicShortcuts(shortcuts: DynamicShortcut[]): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.setDynamicShortcuts(JSON.stringify(shortcuts))
}

/**
 * Remove all dynamic shortcuts.
 */
export function removeAllDynamicShortcuts(): void {
  try {
    getModule()?.removeAllDynamicShortcuts()
  } catch {
    // Ignore errors on unsupported platforms
  }
}

/**
 * Update existing pinned shortcuts (e.g. after a trigger is renamed).
 *
 * @param shortcuts Array of shortcut definitions to update
 */
export async function updatePinnedShortcuts(shortcuts: DynamicShortcut[]): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.updatePinnedShortcuts(JSON.stringify(shortcuts))
}

/**
 * Get the IDs of all currently pinned shortcuts.
 */
export async function getPinnedShortcutIds(): Promise<string[]> {
  try {
    return (await getModule()?.getPinnedShortcutIds()) ?? []
  } catch {
    return []
  }
}

/**
 * Disable pinned shortcuts by ID. A disabled shortcut shows
 * a message when tapped instead of performing its action.
 *
 * @param ids     Shortcut IDs to disable
 * @param message Message shown when the disabled shortcut is tapped
 */
export async function disableShortcuts(ids: string[], message: string): Promise<void> {
  const mod = getModule()
  if (!mod) return
  await mod.disableShortcuts(ids, message)
}
