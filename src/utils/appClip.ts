import { isIOS } from './platform'

/**
 * Whether the app is currently running as an iOS App Clip.
 *
 * On iOS this checks the bundle identifier suffix via the native
 * `app-clip-info` module.  On all other platforms it returns `false`.
 */
export const isAppClip: boolean = (() => {
  if (!isIOS) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isAppClip: nativeValue } = require('../../modules/app-clip-info')
    return nativeValue === true
  } catch {
    return false
  }
})()
