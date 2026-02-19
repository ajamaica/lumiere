import * as Updates from 'expo-updates'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

import { logger } from '../utils/logger'

/**
 * Checks for OTA updates on app launch (native only).
 *
 * When an update is available the user is shown an alert with the option to
 * restart now or later.  If they choose "later" the update is still
 * downloaded — it will be applied on the next cold start automatically.
 */
export function useOTAUpdates(): void {
  const { t } = useTranslation()

  useEffect(() => {
    // In dev mode or when running inside Expo Go, the Updates API is not
    // available.  Skip silently.
    if (__DEV__ || !Updates.isEnabled) return

    let cancelled = false

    const checkForUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync()
        if (cancelled || !update.isAvailable) return

        const result = await Updates.fetchUpdateAsync()
        if (cancelled || !result.isNew) return

        Alert.alert(t('updates.title'), t('updates.message'), [
          { text: t('updates.later'), style: 'cancel' },
          {
            text: t('updates.restart'),
            onPress: () => Updates.reloadAsync(),
          },
        ])
      } catch (error) {
        logger.warn('OTA update check failed', error)
      }
    }

    checkForUpdate()

    return () => {
      cancelled = true
    }
  }, [t])
}
