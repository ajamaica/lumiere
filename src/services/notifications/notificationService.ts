import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export type NotificationChannel = 'gateway' | 'cron' | 'health'

const CHANNEL_CONFIG: Record<NotificationChannel, { name: string; description: string }> = {
  gateway: {
    name: 'Gateway Events',
    description: 'Notifications for gateway connection and agent events',
  },
  cron: {
    name: 'Cron Jobs',
    description: 'Notifications for scheduled cron job completions',
  },
  health: {
    name: 'Health Alerts',
    description: 'Notifications for gateway health status changes',
  },
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    for (const [id, config] of Object.entries(CHANNEL_CONFIG)) {
      await Notifications.setNotificationChannelAsync(id, {
        name: config.name,
        description: config.description,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    }
  }
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  return finalStatus === 'granted'
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  channel: NotificationChannel = 'gateway',
  data?: Record<string, unknown>,
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { channel, ...data },
      ...(Platform.OS === 'android' ? { channelId: channel } : {}),
    },
    trigger: null, // Immediate delivery
  })
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync()
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync()
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count)
}
