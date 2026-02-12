/**
 * TypeScript wrapper for the AndroidBubbles native Expo module.
 *
 * At build time the native module is linked automatically by Expo.
 * We use `require` + runtime guard so the app doesn't crash on
 * platforms where the module doesn't exist (iOS, web).
 */

interface AndroidBubblesNativeModule {
  isAvailable(): boolean
  canBubble(): boolean
  showBubble(title: string, message: string, serverId: string, sessionKey: string): Promise<void>
  createChannel(): Promise<void>
}

let nativeModule: AndroidBubblesNativeModule | null = null

function getModule(): AndroidBubblesNativeModule {
  if (!nativeModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('AndroidBubbles') as AndroidBubblesNativeModule
  }
  return nativeModule
}

/**
 * Check if the Android Bubbles API is available on this device.
 * Returns false on iOS, web, or Android < 11 (API 30).
 */
export function isAvailable(): boolean {
  try {
    return getModule().isAvailable()
  } catch {
    return false
  }
}

/**
 * Check if the app can actually show bubbles (channel exists and user hasn't disabled them).
 */
export function canBubble(): boolean {
  try {
    return getModule().canBubble()
  } catch {
    return false
  }
}

/**
 * Create the notification channel with bubble support.
 * Should be called once during app initialization.
 */
export async function createChannel(): Promise<void> {
  try {
    await getModule().createChannel()
  } catch {
    // Silently fail on unsupported platforms
  }
}

/**
 * Show a floating chat bubble notification.
 * @param title - The conversation title (e.g., server name)
 * @param message - The message preview text
 * @param serverId - The server ID to navigate to when bubble is tapped
 * @param sessionKey - The session key to navigate to when bubble is tapped
 */
export async function showBubble(
  title: string,
  message: string,
  serverId: string,
  sessionKey: string,
): Promise<void> {
  try {
    await getModule().showBubble(title, message, serverId, sessionKey)
  } catch {
    // Silently fail on unsupported platforms
  }
}
