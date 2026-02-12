import { useAtom } from 'jotai'
import { useEffect, useRef } from 'react'

import { isICloudAvailable, startICloudSync, stopICloudSync } from '../services/icloudSync'
import { icloudSyncEnabledAtom } from '../store'
import { isIOS } from '../utils/platform'

/**
 * Hook that manages iCloud sync lifecycle.
 *
 * When iCloud sync is enabled, starts bidirectional sync between Jotai atoms
 * and NSUbiquitousKeyValueStore. Automatically stops sync when disabled.
 *
 * Should be mounted once in the root layout.
 */
export function useICloudSync() {
  const [icloudSyncEnabled, setIcloudSyncEnabled] = useAtom(icloudSyncEnabledAtom)
  const syncActiveRef = useRef(false)

  useEffect(() => {
    if (!isIOS) return

    if (icloudSyncEnabled && isICloudAvailable()) {
      startICloudSync()
      syncActiveRef.current = true
    } else if (syncActiveRef.current) {
      stopICloudSync()
      syncActiveRef.current = false
    }

    return () => {
      if (syncActiveRef.current) {
        stopICloudSync()
        syncActiveRef.current = false
      }
    }
  }, [icloudSyncEnabled])

  return {
    icloudSyncEnabled,
    setIcloudSyncEnabled,
    isICloudAvailable: isIOS && isICloudAvailable(),
  }
}
