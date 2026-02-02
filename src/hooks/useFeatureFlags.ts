import { useAtom } from 'jotai'
import { useCallback } from 'react'

import { FeatureFlags, featureFlagsAtom } from '../store'

export interface UseFeatureFlagsResult {
  flags: FeatureFlags
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void
}

export function useFeatureFlags(): UseFeatureFlagsResult {
  const [flags, setFlags] = useAtom(featureFlagsAtom)

  const setFlag = useCallback(
    <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
      setFlags((prev) => ({ ...prev, [key]: value }))
    },
    [setFlags],
  )

  return { flags, setFlag }
}
