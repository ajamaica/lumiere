import * as Haptics from 'expo-haptics'
import { useAtomValue } from 'jotai'
import { useCallback, useMemo } from 'react'

import { hapticFeedbackEnabledAtom } from '../store'

/**
 * Provides haptic feedback helpers gated by the user preference.
 *
 * On native (iOS / Android) this calls into `expo-haptics`.
 * On web a stub is loaded instead (see `useHaptics.ts`).
 */
export function useHaptics() {
  const enabled = useAtomValue(hapticFeedbackEnabledAtom)

  const light = useCallback(() => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [enabled])

  const medium = useCallback(() => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [enabled])

  const heavy = useCallback(() => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }, [enabled])

  const selection = useCallback(() => {
    if (enabled) Haptics.selectionAsync()
  }, [enabled])

  const warning = useCallback(() => {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  }, [enabled])

  const error = useCallback(() => {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }, [enabled])

  const success = useCallback(() => {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [enabled])

  return useMemo(
    () => ({ light, medium, heavy, selection, warning, error, success }),
    [light, medium, heavy, selection, warning, error, success],
  )
}
