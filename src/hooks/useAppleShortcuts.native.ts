import { useRouter } from 'expo-router'
import { getDefaultStore, useAtomValue } from 'jotai'
import { useCallback, useEffect } from 'react'

import {
  addActivityListener,
  addTriggerListener,
  consumePendingActivity,
  consumePendingTrigger,
  isAvailable,
  type SiriActivityEvent,
  syncServers,
  syncTriggers,
} from '../../modules/apple-shortcuts'
import {
  currentServerIdAtom,
  currentSessionKeyAtom,
  pendingTriggerMessageAtom,
  serversAtom,
  type ServersDict,
  type TriggerConfig,
  triggersAtom,
} from '../store'

/**
 * Resolves an atom value, handling the Promise that
 * atomWithStorage may return before hydration completes.
 */
async function resolveAtom<T>(raw: T | Promise<T>): Promise<T> {
  return raw instanceof Promise ? await raw : raw
}

/**
 * Executes a trigger by switching to the trigger's server/session
 * and setting a pending message for the chat screen to auto-send.
 */
async function executeTrigger(slug: string) {
  const store = getDefaultStore()
  const triggers = await resolveAtom(store.get(triggersAtom))
  const trigger = triggers[slug]
  if (!trigger) return

  store.set(currentServerIdAtom, trigger.serverId)
  store.set(currentSessionKeyAtom, trigger.sessionKey)
  store.set(pendingTriggerMessageAtom, trigger.message)
}

/**
 * Handles a Siri Suggestion activity by switching to the target server.
 */
function handleActivity(event: SiriActivityEvent) {
  const store = getDefaultStore()

  if (event.serverId) {
    store.set(currentServerIdAtom, event.serverId)
  }
  if (event.sessionKey) {
    store.set(currentSessionKeyAtom, event.sessionKey)
  }
}

/**
 * Syncs user-created triggers to Apple Shortcuts (iOS 16+ via AppIntents),
 * syncs servers for Siri Suggestions, and handles shortcut executions and
 * Siri Suggestion activities.
 *
 * Call once in the root layout alongside useQuickActions.
 */
export function useAppleShortcuts() {
  const triggers = useAtomValue(triggersAtom)
  const servers = useAtomValue(serversAtom)
  const router = useRouter()

  // Sync triggers → Apple Shortcuts whenever they change
  useEffect(() => {
    if (!isAvailable()) return

    async function sync() {
      const resolved = await resolveAtom<Record<string, TriggerConfig>>(triggers)
      const resolvedServers = await resolveAtom<ServersDict>(servers)

      const items = Object.values(resolved)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((t) => ({
          id: t.id,
          name: t.message.length > 40 ? `${t.message.slice(0, 37)}...` : t.message,
          serverName: resolvedServers[t.serverId]?.name ?? 'Unknown server',
        }))

      await syncTriggers(items)
    }

    sync()
  }, [triggers, servers])

  // Sync servers → native module for Siri Suggestions intents
  useEffect(() => {
    if (!isAvailable()) return

    async function sync() {
      const resolvedServers = await resolveAtom<ServersDict>(servers)

      const items = Object.values(resolvedServers).map((s) => ({
        id: s.id,
        name: s.name,
        providerType: s.providerType,
      }))

      await syncServers(items)
    }

    sync()
  }, [servers])

  const handleTrigger = useCallback(
    async (slug: string) => {
      await executeTrigger(slug)

      // Dismiss open modals to reveal the chat screen
      if (router.canDismiss()) {
        router.dismissAll()
      }
    },
    [router],
  )

  const handleSiriActivity = useCallback(
    (event: SiriActivityEvent) => {
      handleActivity(event)

      // Dismiss open modals to reveal the chat screen
      if (router.canDismiss()) {
        router.dismissAll()
      }
    },
    [router],
  )

  // On mount: check for a cold-start pending trigger
  useEffect(() => {
    if (!isAvailable()) return

    const slug = consumePendingTrigger()
    if (slug) {
      handleTrigger(slug)
    }
  }, [handleTrigger])

  // On mount: check for a cold-start pending Siri Suggestion activity
  useEffect(() => {
    if (!isAvailable()) return

    const activity = consumePendingActivity()
    if (activity) {
      handleSiriActivity(activity)
    }
  }, [handleSiriActivity])

  // Listen for trigger events while the app is running
  useEffect(() => {
    if (!isAvailable()) return

    const cleanup = addTriggerListener((slug) => {
      handleTrigger(slug)
    })

    return cleanup
  }, [handleTrigger])

  // Listen for Siri Suggestion activity events while the app is running
  useEffect(() => {
    if (!isAvailable()) return

    const cleanup = addActivityListener((event) => {
      handleSiriActivity(event)
    })

    return cleanup
  }, [handleSiriActivity])
}
