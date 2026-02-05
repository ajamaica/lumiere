/**
 * TypeScript wrapper for the LumiereWidget native Expo module.
 *
 * Provides methods to interact with the iOS home screen widget.
 */

interface LumiereWidgetNativeModule {
  isAvailable(): boolean
  reloadAllTimelines(): void
}

let nativeModule: LumiereWidgetNativeModule | null = null

function getModule(): LumiereWidgetNativeModule {
  if (!nativeModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('LumiereWidget') as LumiereWidgetNativeModule
  }
  return nativeModule
}

/**
 * Check if widgets are available on this device.
 * Returns false on Android or unsupported iOS versions.
 */
export function isWidgetAvailable(): boolean {
  try {
    return getModule().isAvailable()
  } catch {
    return false
  }
}

/**
 * Request the system to reload all widget timelines.
 * Call this when app data changes that the widget should reflect.
 */
export function reloadWidgets(): void {
  try {
    getModule().reloadAllTimelines()
  } catch {
    // Widget not available on this platform
  }
}
