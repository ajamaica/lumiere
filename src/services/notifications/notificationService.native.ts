import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import {
  backgroundNotificationsEnabledAtom,
  chatBubblesEnabledAtom,
  currentSessionKeyAtom,
  getStore,
  notificationLastCheckAtom,
  type NotificationLastCheckMap,
  serversAtom,
  serverSessionsAtom,
} from '../../store'
import { isAndroid } from '../../utils/platform'
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
 * Fetch all session keys for a Molt server via the HTTP RPC endpoint.
 * Falls back to the provided default session key on failure.
 */
async function listServerSessions(
  serverUrl: string,
  token: string,
  fallbackSessionKey: string,
): Promise<string[]> {
  try {
    const response = await fetch(`${httpUrl(serverUrl)}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ method: 'sessions.list' }),
    })

    if (!response.ok) return [fallbackSessionKey]

    const data = (await response.json()) as {
      sessions?: Array<{ key: string }>
    }

    const keys = data.sessions?.map((s) => s.key).filter(Boolean)
    return keys && keys.length > 0 ? keys : [fallbackSessionKey]
  } catch {
    return [fallbackSessionKey]
  }
}

/**
 * The background task that runs periodically. It reads server configs from
 * Jotai store, checks Molt servers for new assistant messages across all
 * sessions, and fires a local notification per new message.
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

      // Only Molt servers expose the /api/rpc endpoint for background polling
      if (server.providerType !== 'molt') continue

      const token = await getServerToken(serverId)
      if (!token) continue

      const fallbackSessionKey = sessions[serverId] ?? defaultSession
      const sessionKeys = await listServerSessions(server.url, token, fallbackSessionKey)

      for (const sessionKey of sessionKeys) {
        const result = await checkServerForNewMessages(server.url, token, sessionKey, serverId)

        if (result.hasNew) {
          const title = server.name ?? 'Lumiere'
          const body = result.preview ?? 'You have a new message'

          // Use Android Bubbles API when enabled
          if (isAndroid && (await shouldUseBubbles())) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const { showBubble } = require('../../../modules/android-bubbles')
              await showBubble(title, body, serverId, sessionKey)
            } catch {
              // Fall back to regular notification if bubbles fail
              await scheduleRegularNotification(title, body, serverId, sessionKey)
            }
          } else {
            await scheduleRegularNotification(title, body, serverId, sessionKey)
          }
        }
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
 * Check if we should use the Android Bubbles API for notifications.
 */
async function shouldUseBubbles(): Promise<boolean> {
  try {
    const store = getStore()
    const bubblesEnabled = await resolveAtom(store.get(chatBubblesEnabledAtom))
    if (!bubblesEnabled) return false

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isAvailable } = require('../../../modules/android-bubbles')
    return isAvailable()
  } catch {
    return false
  }
}

/**
 * Schedule a regular (non-bubble) notification.
 */
async function scheduleRegularNotification(
  title: string,
  body: string,
  serverId: string,
  sessionKey: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { serverId, sessionKey },
      sound: 'default',
    },
    trigger: null, // fire immediately
  })
}

/**
 * Initialize the Android Bubbles notification channel if supported.
 * Should be called during app startup.
 */
export async function initBubbleChannel(): Promise<void> {
  if (!isAndroid) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createChannel, isAvailable } = require('../../../modules/android-bubbles')
    if (isAvailable()) {
      await createChannel()
    }
  } catch {
    // Silently fail — module may not be available
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
