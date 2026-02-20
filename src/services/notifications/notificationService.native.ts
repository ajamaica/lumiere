import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'

import {
  backgroundNotificationsEnabledAtom,
  currentSessionKeyAtom,
  expoPushTokenAtom,
  type GatewayLastSeenMap,
  gatewayLastSeenTimestampAtom,
  getStore,
  pushTokenRegistrationsAtom,
  serversAtom,
  serverSessionsAtom,
} from '../../store'
import { logger } from '../../utils/logger'
import { toHttpUrl } from '../molt/url'
import type { ChatHistoryMessage } from '../providers/types'
import { getServerToken } from '../secureTokenStorage'

const pushLogger = logger.create('PushNotifications')

export const BACKGROUND_FETCH_TASK = 'background-server-check'

async function getLastSeenMap(): Promise<GatewayLastSeenMap> {
  const raw = getStore().get(gatewayLastSeenTimestampAtom)
  // Handle hydration: atomWithStorage may return a Promise during initial load
  return raw instanceof Promise ? await raw : raw
}

async function setLastSeenTimestamp(serverSessionKey: string, timestamp: number): Promise<void> {
  const map = await getLastSeenMap()
  getStore().set(gatewayLastSeenTimestampAtom, { ...map, [serverSessionKey]: timestamp })
}

/**
 * Check a server session for new assistant messages by fetching the gateway's
 * chat history and comparing against the last message timestamp we recorded
 * from a previous gateway history response.
 */
async function checkServerForNewMessages(
  serverUrl: string,
  token: string,
  sessionKey: string,
  serverId: string,
): Promise<{ hasNew: boolean; preview?: string; serverName?: string }> {
  const serverSessionKey = `${serverId}:${sessionKey}`

  try {
    // Fetch the latest messages from the server gateway
    const response = await fetch(`${toHttpUrl(serverUrl)}/api/rpc`, {
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
      messages?: ChatHistoryMessage[]
    }

    const serverMessages = data.messages ?? []

    if (serverMessages.length === 0) return { hasNew: false }

    // Find the most recent message timestamp from the gateway response
    const latestGatewayTimestamp = Math.max(...serverMessages.map((m) => m.timestamp))

    // Retrieve what we last saw from this gateway session
    const lastSeenMap = await getLastSeenMap()
    const lastSeenTimestamp = lastSeenMap[serverSessionKey] ?? null

    // First check for this session — record baseline without notifying
    if (lastSeenTimestamp === null) {
      await setLastSeenTimestamp(serverSessionKey, latestGatewayTimestamp)
      return { hasNew: false }
    }

    // Find assistant messages from the gateway that are newer than last seen
    const newAssistantMessages = serverMessages.filter(
      (m) => m.role === 'assistant' && m.timestamp > lastSeenTimestamp,
    )

    // Always update the stored timestamp to the latest gateway value
    await setLastSeenTimestamp(serverSessionKey, latestGatewayTimestamp)

    if (newAssistantMessages.length > 0) {
      const latest = newAssistantMessages[newAssistantMessages.length - 1]
      const text =
        latest.content?.find((c) => c.type === 'text')?.text?.slice(0, 100) ?? 'New message'

      return { hasNew: true, preview: text }
    }

    return { hasNew: false }
  } catch {
    // Network error in background — silently ignore
    return { hasNew: false }
  }
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
    const response = await fetch(`${toHttpUrl(serverUrl)}/api/rpc`, {
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
 * Jotai store, fetches chat history from each Molt server gateway, compares
 * against the last seen message timestamp, and fires a local notification
 * when new assistant messages are found.
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

// ─── Push Token Registration ─────────────────────────────────────────────────

const EXPO_PROJECT_ID = '24d55021-5419-4ad2-b491-7aad43cbbdec'

/**
 * Get the Expo push token for this device. The token is cached in the
 * Jotai store so subsequent calls don't hit the Expo API again.
 * @returns The Expo push token string, or null if unavailable
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const store = getStore()
    const cached = await resolveAtom(store.get(expoPushTokenAtom))
    if (cached) return cached

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    })

    const token = tokenResponse.data
    store.set(expoPushTokenAtom, token)
    pushLogger.info('Obtained Expo push token', { tokenSuffix: token.slice(-8) })
    return token
  } catch (error) {
    pushLogger.logError('Failed to get Expo push token', error)
    return null
  }
}

/**
 * Register the Expo push token with a single Molt gateway via HTTP RPC.
 * This allows the server to send push notifications to this device.
 */
export async function registerPushTokenWithServer(
  serverId: string,
  serverUrl: string,
  authToken: string,
  pushToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${toHttpUrl(serverUrl)}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        method: 'push.register',
        params: {
          pushToken,
          provider: 'expo',
          platform: Platform.OS,
        },
      }),
    })

    if (!response.ok) {
      pushLogger.error(`push.register failed for server ${serverId}: HTTP ${response.status}`)
      return false
    }

    // Track that this server has been registered with the current push token
    const store = getStore()
    const registrations = await resolveAtom(store.get(pushTokenRegistrationsAtom))
    store.set(pushTokenRegistrationsAtom, { ...registrations, [serverId]: pushToken })

    pushLogger.info(`Push token registered with server ${serverId}`)
    return true
  } catch (error) {
    pushLogger.logError(`Failed to register push token with server ${serverId}`, error)
    return false
  }
}

/**
 * Register the Expo push token with all connected Molt servers.
 * Skips servers that are already registered with the current token.
 */
export async function registerPushTokenWithAllServers(): Promise<void> {
  const store = getStore()
  const notificationsEnabled = await resolveAtom(store.get(backgroundNotificationsEnabledAtom))
  if (!notificationsEnabled) return

  const pushToken = await getExpoPushToken()
  if (!pushToken) return

  const servers = await resolveAtom(store.get(serversAtom))
  const registrations = await resolveAtom(store.get(pushTokenRegistrationsAtom))

  for (const serverId of Object.keys(servers)) {
    const server = servers[serverId]
    if (server.providerType !== 'molt') continue

    // Skip if already registered with the same token
    if (registrations[serverId] === pushToken) continue

    const authToken = await getServerToken(serverId)
    if (!authToken) continue

    await registerPushTokenWithServer(serverId, server.url, authToken, pushToken)
  }
}

/**
 * Clear cached push token and registrations. Called when the user
 * disables notifications so the token is re-fetched on next enable.
 */
export async function clearPushTokenRegistrations(): Promise<void> {
  const store = getStore()
  store.set(expoPushTokenAtom, null)
  store.set(pushTokenRegistrationsAtom, {})
}
