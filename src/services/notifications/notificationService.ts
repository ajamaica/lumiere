import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import {
  backgroundNotificationsEnabledAtom,
  currentSessionKeyAtom,
  getStore,
  notificationLastCheckAtom,
  type NotificationLastCheckMap,
  serversAtom,
  serverSessionsAtom,
} from '../../store'
import { getServerToken } from '../secureTokenStorage'

export const BACKGROUND_FETCH_TASK = 'background-server-check'

async function getLastCheckMap(): Promise<NotificationLastCheckMap> {
  const raw = getStore().get(notificationLastCheckAtom)
  // Handle hydration: atomWithStorage may return a Promise during initial load
  return raw instanceof Promise ? await raw : raw
}

async function setLastCheck(serverSessionKey: string, timestamp: number): Promise<void> {
  const map = await getLastCheckMap()
  getStore().set(notificationLastCheckAtom, { ...map, [serverSessionKey]: timestamp })
}

/**
 * Perform an HTTP health + chat history check against a server.
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
    const assistantMessages = messages.filter(
      (m) => m.role === 'assistant' && m.timestamp > lastCheck,
    )

    if (assistantMessages.length > 0) {
      const latest = assistantMessages[assistantMessages.length - 1]
      const text =
        latest.content?.find((c) => c.type === 'text')?.text?.slice(0, 100) ?? 'New message'

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
 * Helper to resolve atom values that may be Promises during hydration.
 */
async function resolveAtom<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? await value : value
}

/**
 * The background task that runs periodically. It reads server configs from
 * Jotai store, checks Claude and Clawd servers for new assistant messages,
 * and fires a local notification.
 */
export async function backgroundCheckTask(): Promise<BackgroundTask.BackgroundTaskResult> {
  try {
    const store = getStore()
    const notificationsEnabled = await resolveAtom(store.get(backgroundNotificationsEnabledAtom))

    if (!notificationsEnabled) {
      return BackgroundTask.BackgroundTaskResult.Success
    }

    const servers = await resolveAtom(store.get(serversAtom))
    const sessions = await resolveAtom(store.get(serverSessionsAtom))
    const defaultSession = await resolveAtom(store.get(currentSessionKeyAtom))

    for (const serverId of Object.keys(servers)) {
      const server = servers[serverId]

      // Only check Claude and Clawd servers (they have a gateway that supports background polling)
      const serverName = server.name?.toLowerCase() ?? ''
      if (serverName !== 'claude' && serverName !== 'clawd') continue

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
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success
  } catch (error) {
    console.error('[BackgroundCheck] Error:', error)
    return BackgroundTask.BackgroundTaskResult.Failed
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
 * Enable and register the background task with the OS.
 * @param intervalMinutes - Minimum interval between background task executions
 */
export async function registerBackgroundFetch(intervalMinutes: number = 15): Promise<void> {
  await BackgroundTask.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: intervalMinutes * 60, // Convert minutes to seconds
  })
}

/**
 * Unregister the background task.
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK)
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_FETCH_TASK)
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
