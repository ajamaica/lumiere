import { useMemo } from 'react'

const noop = () => {}

/**
 * Web stub — haptic feedback is not available on web.
 * Every method is a no-op so callers don't need platform guards.
 */
export function useHaptics() {
  return useMemo(
    () => ({
      light: noop,
      medium: noop,
      heavy: noop,
      selection: noop,
      warning: noop,
      error: noop,
      success: noop,
    }),
    [],
  )
}
