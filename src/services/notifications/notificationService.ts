import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundFetch from 'expo-background-fetch'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import { getServerToken } from '../secureTokenStorage'

export const BACKGROUND_FETCH_TASK = 'background-server-check'

/** Key used to store the last-known message timestamp per server+session */
const LAST_CHECK_KEY = 'notifications_last_check'

interface LastCheckMap {
  [serverSessionKey: string]: number
}

async function getLastCheckMap(): Promise<LastCheckMap> {
  const raw = await AsyncStorage.getItem(LAST_CHECK_KEY)
  return raw ? JSON.parse(raw) : {}
}

async function setLastCheck(serverSessionKey: string, timestamp: number): Promise<void> {
  const map = await getLastCheckMap()
  map[serverSessionKey] = timestamp
  await AsyncStorage.setItem(LAST_CHECK_KEY, JSON.stringify(map))
}

/**
 * Perform an HTTP health + chat history check against a Molt server.
 * Returns the latest assistant message if it arrived after our last check.
 */
async function checkServerForNewMessages(
  serverUrl: string,
  token: string,
  sessionKey: string,
  serverId: string,
): Promise<{ hasNew: boolean; preview?: string; serverName?: string }> {
  const serverSessionKey = `${serverId}:${sessionKey}`
  const lastCheckMap = await getLastCheckMap()
  const lastCheck = lastCheckMap[serverSessionKey] ?? Date.now()

  try {
    // Use the HTTP REST endpoint to check for new messages.
    // Molt gateways expose POST /api/rpc for JSON-RPC style calls.
    const response = await fetch(`${httpUrl(serverUrl)}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        method: 'chat.history',
        params: { sessionKey, limit: 5 },
      }),
    })

    if (!response.ok) return { hasNew: false }

    const data = (await response.json()) as {
      messages?: Array<{
        role: string
        content: Array<{ type: string; text?: string }>
        timestamp: number
      }>
    }

    const messages = data.messages ?? []
    // Find newest assistant message
    const assistantMessages = messages.filter((m) => m.role === 'assistant' && m.timestamp > lastCheck)

    if (assistantMessages.length > 0) {
      const latest = assistantMessages[assistantMessages.length - 1]
      const text =
        latest.content
          ?.find((c) => c.type === 'text')
          ?.text?.slice(0, 100) ?? 'New message'

      // Update the last check to now
      await setLastCheck(serverSessionKey, Date.now())
      return { hasNew: true, preview: text }
    }

    // No new messages — still update the checkpoint
    await setLastCheck(serverSessionKey, Date.now())
    return { hasNew: false }
  } catch {
    // Network error in background — silently ignore
    return { hasNew: false }
  }
}

/**
 * Convert a WebSocket URL (ws:// or wss://) to its HTTP equivalent.
 */
function httpUrl(url: string): string {
  return url.replace(/^ws(s?):\/\//, 'http$1://')
}

/**
 * The background task that runs periodically. It reads server configs from
 * AsyncStorage (since Jotai atoms are not available outside React), checks
 * each Molt server for new assistant messages, and fires a local notification.
 */
export async function backgroundCheckTask(): Promise<BackgroundFetch.BackgroundFetchResult> {
  try {
    const serversRaw = await AsyncStorage.getItem('servers')
    const sessionsRaw = await AsyncStorage.getItem('serverSessions')
    const currentSessionRaw = await AsyncStorage.getItem('currentSessionKey')
    const notificationsEnabled = await AsyncStorage.getItem('backgroundNotificationsEnabled')

    if (notificationsEnabled !== 'true') {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    const servers = serversRaw ? JSON.parse(serversRaw) : {}
    const sessions = sessionsRaw ? JSON.parse(sessionsRaw) : {}
    const defaultSession = currentSessionRaw ? JSON.parse(currentSessionRaw) : 'agent:main:main'

    let notifiedCount = 0

    for (const serverId of Object.keys(servers)) {
      const server = servers[serverId]

      // Only check Molt servers (they have a gateway we can poll)
      if (server.providerType !== 'molt') continue

      const token = await getServerToken(serverId)
      if (!token) continue

      const sessionKey = sessions[serverId] ?? defaultSession

      const result = await checkServerForNewMessages(server.url, token, sessionKey, serverId)

      if (result.hasNew) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: server.name ?? 'Lumiere',
            body: result.preview ?? 'You have a new message',
            data: { serverId, sessionKey },
            sound: 'default',
          },
          trigger: null, // fire immediately
        })
        notifiedCount++
      }
    }

    return notifiedCount > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch (error) {
    console.error('[BackgroundCheck] Error:', error)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
}

/**
 * Register the background fetch task. Must be called at module scope
 * (outside of React components) so the OS can invoke it while the app
 * is in the background.
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  return await backgroundCheckTask()
})

/**
 * Enable and register the background fetch with the OS.
 * @param intervalMinutes - Minimum interval between background fetches
 */
export async function registerBackgroundFetch(intervalMinutes: number = 15): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync()

  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn('[BackgroundFetch] Background fetch is restricted or denied by the OS')
    return
  }

  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: intervalMinutes * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

/**
 * Unregister the background fetch task.
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK)
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK)
  }
}

/**
 * Configure the notification handler (how notifications appear when app is in foreground).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

/**
 * Request notification permissions from the user.
 * @returns true if granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  return finalStatus === 'granted'
}
