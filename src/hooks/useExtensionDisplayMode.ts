/**
 * Extension display mode hook — native stub.
 *
 * On iOS/Android the app is never running inside a Chrome extension,
 * so every value is a harmless no-op.
 */

export type ExtensionDisplayMode = 'popup' | 'sidebar' | 'fullscreen' | 'web'

export interface ExtensionDisplayModeResult {
  mode: ExtensionDisplayMode
  isExtension: boolean
  openFullscreen: () => void
  openSidebar: () => void
}

const NOOP = () => {}

const NATIVE_RESULT: ExtensionDisplayModeResult = {
  mode: 'web',
  isExtension: false,
  openFullscreen: NOOP,
  openSidebar: NOOP,
}

export function useExtensionDisplayMode(): ExtensionDisplayModeResult {
  return NATIVE_RESULT
}
