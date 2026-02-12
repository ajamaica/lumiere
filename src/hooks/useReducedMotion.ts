import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Hook that listens to the system's "Reduce Motion" accessibility setting.
 * When enabled, animations should be simplified or disabled entirely.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion)

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion)

    return () => {
      subscription.remove()
    }
  }, [])

  return reducedMotion
}
