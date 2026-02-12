import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import { useEffect, useRef } from 'react'

import {
  configureNotificationHandler,
  registerBackgroundFetch,
  requestNotificationPermissions,
  unregisterBackgroundFetch,
} from '../services/notifications'
import {
  backgroundFetchIntervalAtom,
  backgroundNotificationsEnabledAtom,
  currentServerIdAtom,
  currentSessionKeyAtom,
} from '../store'

/**
 * Hook that manages the full notification lifecycle:
 * - Requests permissions when background notifications are enabled
 * - Registers/unregisters the background fetch task
 * - Handles notification taps (navigates to the correct server/session)
 */
export function useNotifications() {
  const router = useRouter()
  const [enabled] = useAtom(backgroundNotificationsEnabledAtom)
  const [interval] = useAtom(backgroundFetchIntervalAtom)
  const [, setCurrentServerId] = useAtom(currentServerIdAtom)
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  // Configure how foreground notifications are displayed
  useEffect(() => {
    configureNotificationHandler()
  }, [])

  // Register or unregister background fetch based on the setting
  useEffect(() => {
    if (enabled) {
      ;(async () => {
        try {
          // Unregister first to avoid duplicate registrations when interval changes
          await unregisterBackgroundFetch()
          const granted = await requestNotificationPermissions()
          if (granted) {
            await registerBackgroundFetch(interval)
          }
        } catch (error) {
          console.error('[useNotifications] Failed to register background task:', error)
        }
      })()
    } else {
      unregisterBackgroundFetch().catch((error) => {
        console.error('[useNotifications] Failed to unregister background task:', error)
      })
    }
  }, [enabled, interval])

  // Handle notification taps — switch to the server/session from the notification
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        serverId?: string
        sessionKey?: string
      }

      if (data.serverId) {
        setCurrentServerId(data.serverId)
      }
      if (data.sessionKey) {
        setCurrentSessionKey(data.sessionKey)
      }

      // Navigate to chat screen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/' as any)
    })

    return () => {
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [router, setCurrentServerId, setCurrentSessionKey])
}
