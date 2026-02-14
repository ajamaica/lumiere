import * as BackgroundTask from 'expo-background-task'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import { CACHE_CONFIG } from '../../constants'
import {
  backgroundNotificationsEnabledAtom,
  currentSessionKeyAtom,
  getStore,
  jotaiStorage,
  serversAtom,
  serverSessionsAtom,
} from '../../store'
import { buildCacheKey, readCachedHistory, readSessionIndex } from '../providers/CachedChatProvider'
import type { ChatHistoryMessage } from '../providers/types'
import { getServerToken } from '../secureTokenStorage'

export const BACKGROUND_FETCH_TASK = 'background-server-check'

/**
 * Write messages to the local chat cache for a given server and session.
 * Merges new messages with existing cached messages, deduplicating by timestamp,
 * and trims to the configured maximum.
 */
async function updateCachedMessages(
  serverId: string,
  sessionKey: string,
  serverMessages: ChatHistoryMessage[],
): Promise<void> {
  try {
    const existing = await readCachedHistory(serverId, sessionKey)
    const lastCachedTimestamp =
      existing.length > 0 ? Math.max(...existing.map((m) => m.timestamp)) : 0

    // Only append messages newer than what we already have
    const newMessages = serverMessages.filter((m) => m.timestamp > lastCachedTimestamp)

    if (newMessages.length === 0) return

    const merged = [...existing, ...newMessages]
    const trimmed = merged.slice(-CACHE_CONFIG.MAX_CACHED_MESSAGES)
    const cacheKey = buildCacheKey(serverId, sessionKey)
    await jotaiStorage.setItem(cacheKey, trimmed)
  } catch {
    // Silently ignore cache write errors in background
  }
}

/**
 * Check a server session for new assistant messages by comparing the server's
 * chat history against the locally cached history. This avoids relying on
 * separate timestamp tracking — the cache itself is the source of truth.
 */
async function checkServerForNewMessages(
  serverUrl: string,
  token: string,
  sessionKey: string,
  serverId: string,
): Promise<{ hasNew: boolean; preview?: string; serverName?: string }> {
  try {
    // Read locally cached history to determine what we've already seen
    const cachedMessages = await readCachedHistory(serverId, sessionKey)

    // Fetch the latest messages from the server
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
      messages?: ChatHistoryMessage[]
    }

    const serverMessages = data.messages ?? []

    // If cache is empty this is the first check — establish a baseline
    // by caching the current server state without sending notifications.
    if (cachedMessages.length === 0) {
      if (serverMessages.length > 0) {
        await updateCachedMessages(serverId, sessionKey, serverMessages)
      }
      return { hasNew: false }
    }

    // Determine the most recent cached message timestamp
    const lastCachedTimestamp = Math.max(...cachedMessages.map((m) => m.timestamp))

    // Find assistant messages from the server that are newer than the cache
    const newAssistantMessages = serverMessages.filter(
      (m) => m.role === 'assistant' && m.timestamp > lastCachedTimestamp,
    )

    if (newAssistantMessages.length > 0) {
      const latest = newAssistantMessages[newAssistantMessages.length - 1]
      const text =
        latest.content?.find((c) => c.type === 'text')?.text?.slice(0, 100) ?? 'New message'

      // Update the cache with new messages from the server
      await updateCachedMessages(serverId, sessionKey, serverMessages)
      return { hasNew: true, preview: text }
    }

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
 * Falls back to the locally cached session index, then to the provided
 * default session key on failure.
 */
async function listServerSessions(
  serverUrl: string,
  token: string,
  fallbackSessionKey: string,
  serverId: string,
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

    if (!response.ok) throw new Error('sessions.list failed')

    const data = (await response.json()) as {
      sessions?: Array<{ key: string }>
    }

    const keys = data.sessions?.map((s) => s.key).filter(Boolean)
    return keys && keys.length > 0 ? keys : [fallbackSessionKey]
  } catch {
    // Fall back to the locally cached session index
    const cachedSessions = await readSessionIndex(serverId)
    if (cachedSessions.length > 0) {
      return cachedSessions.map((s) => s.key)
    }
    return [fallbackSessionKey]
  }
}

/**
 * The background task that runs periodically. It reads server configs from
 * Jotai store, checks Molt servers for new assistant messages across all
 * sessions by comparing server state against the local chat cache, and fires
 * a local notification per new message.
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
      const sessionKeys = await listServerSessions(server.url, token, fallbackSessionKey, serverId)

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
