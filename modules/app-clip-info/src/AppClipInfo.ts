/**
 * TypeScript wrapper for the AppClipInfo native Expo module.
 *
 * Exposes a single boolean indicating whether the app is running
 * as an App Clip. On non-iOS platforms the module is unavailable
 * and defaults to `false`.
 */

interface AppClipInfoNativeModule {
  isAppClip: boolean
}

let cachedResult: boolean | null = null

export const isAppClip: boolean = (() => {
  if (cachedResult !== null) return cachedResult
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    const mod = requireNativeModule('AppClipInfo') as AppClipInfoNativeModule
    cachedResult = mod.isAppClip
    return cachedResult
  } catch {
    cachedResult = false
    return false
  }
})()
