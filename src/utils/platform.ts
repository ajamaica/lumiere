import { Platform } from 'react-native'

/**
 * Centralized platform detection constants and helpers.
 *
 * Instead of scattering `Platform.OS === '...'` checks across the codebase,
 * import the constants and helpers from this module.
 *
 * NOTE: These are evaluated once at module load time.  Services that need
 * runtime checks for testing purposes (e.g. AppleChatProvider) should
 * continue to use `Platform.OS` directly.
 */

// ---------------------------------------------------------------------------
// Core platform identity
// ---------------------------------------------------------------------------

export const isWeb = Platform.OS === 'web'
export const isIOS = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'

/** `true` on iOS and Android — `false` on web. */
export const isNative = !isWeb

// ---------------------------------------------------------------------------
// Platform-specific capabilities
// ---------------------------------------------------------------------------

/**
 * `KeyboardAvoidingView` behavior value.
 * iOS needs `'padding'`; everything else uses `'height'`.
 */
export const keyboardAvoidingBehavior: 'padding' | 'height' = isIOS ? 'padding' : 'height'

/**
 * Platform-appropriate monospace font family.
 * iOS ships with Menlo; Android / web fall back to the generic `monospace`.
 */
export const monospaceFontFamily = isIOS ? 'Menlo' : 'monospace'

// ---------------------------------------------------------------------------
// Web-only style helper
// ---------------------------------------------------------------------------

/**
 * Return `style` on web, or an empty object on native.
 *
 * Useful for CSS-only properties (`userSelect`, `cursor`, …) that are
 * meaningless on native and would generate warnings.
 *
 * @example
 * const styles = StyleSheet.create({
 *   bubble: {
 *     padding: 8,
 *     ...webStyle({ userSelect: 'text' as const }),
 *   },
 * })
 */
export function webStyle<T extends Record<string, unknown>>(style: T): T | Record<string, never> {
  return isWeb ? style : {}
}
