import { useRouter } from 'expo-router'
import { getDefaultStore, useAtomValue } from 'jotai'
import { useCallback, useEffect } from 'react'

import {
  addTriggerListener,
  consumePendingTrigger,
  isAvailable,
  syncTriggers,
} from '../../modules/apple-shortcuts'
import {
  currentServerIdAtom,
  currentSessionKeyAtom,
  pendingTriggerMessageAtom,
  serversAtom,
  type TriggerConfig,
  triggersAtom,
} from '../store'

/**
 * Resolves the triggers atom value, handling the Promise that
 * atomWithStorage may return before hydration completes.
 */
async function resolveTriggers(
  raw: Record<string, TriggerConfig> | Promise<Record<string, TriggerConfig>>,
): Promise<Record<string, TriggerConfig>> {
  return raw instanceof Promise ? await raw : raw
}

/**
 * Executes a trigger by switching to the trigger's server/session
 * and setting a pending message for the chat screen to auto-send.
 */
async function executeTrigger(slug: string) {
  const store = getDefaultStore()
  const triggers = await resolveTriggers(store.get(triggersAtom))
  const trigger = triggers[slug]
  if (!trigger) return

  store.set(currentServerIdAtom, trigger.serverId)
  store.set(currentSessionKeyAtom, trigger.sessionKey)
  store.set(pendingTriggerMessageAtom, trigger.message)
}

/**
 * Syncs user-created triggers to Apple Shortcuts (iOS 16+ via AppIntents)
 * and handles shortcut executions.
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
      const resolved = await resolveTriggers(triggers)
      const resolvedServers = servers instanceof Promise ? await servers : servers

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

  // On mount: check for a cold-start pending trigger
  useEffect(() => {
    if (!isAvailable()) return

    const slug = consumePendingTrigger()
    if (slug) {
      handleTrigger(slug)
    }
  }, [handleTrigger])

  // Listen for trigger events while the app is running
  useEffect(() => {
    if (!isAvailable()) return

    const cleanup = addTriggerListener((slug) => {
      handleTrigger(slug)
    })

    return cleanup
  }, [handleTrigger])
}
