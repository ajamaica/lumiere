import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

import {
  configureNotificationHandler,
  getPermissionStatus,
  registerBackgroundTask,
  requestPermissions,
  setBadgeCount,
  setupNotificationChannels,
  unregisterBackgroundTask,
} from '../services/notifications'
import { notificationsEnabledAtom } from '../store'

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useAtom(notificationsEnabledAtom)
  const router = useRouter()
  const responseListener = useRef<Notifications.Subscription | null>(null)
  const receivedListener = useRef<Notifications.Subscription | null>(null)

  // Initialize notification handling when enabled
  useEffect(() => {
    if (!notificationsEnabled) return

    configureNotificationHandler()
    setupNotificationChannels()

    // Listen for notifications received while app is in foreground
    receivedListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification.request.content.title)
    })

    // Listen for notification taps (user interaction)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      const channel = data?.channel as string | undefined

      // Navigate based on notification channel
      if (channel === 'cron') {
        router.push('/scheduler')
      } else if (channel === 'health') {
        router.push('/overview')
      }

      // Clear badge on interaction
      setBadgeCount(0)
    })

    return () => {
      if (receivedListener.current) {
        receivedListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [notificationsEnabled, router])

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermissions()
    if (!granted) return false

    await setupNotificationChannels()
    configureNotificationHandler()
    await registerBackgroundTask()
    setNotificationsEnabled(true)
    return true
  }, [setNotificationsEnabled])

  const disableNotifications = useCallback(async () => {
    await unregisterBackgroundTask()
    setNotificationsEnabled(false)
    await setBadgeCount(0)
  }, [setNotificationsEnabled])

  const checkPermissionStatus = useCallback(async () => {
    return await getPermissionStatus()
  }, [])

  return {
    notificationsEnabled,
    enableNotifications,
    disableNotifications,
    checkPermissionStatus,
  }
}
