import * as QuickActions from 'expo-quick-actions'
import { useRouter } from 'expo-router'
import { getDefaultStore, useAtomValue } from 'jotai'
import { useCallback, useEffect } from 'react'

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
 * Syncs user-created triggers to iOS 3D Touch / Android home screen
 * quick actions and handles presses.
 *
 * Call this once in the root layout after onboarding / biometric gates.
 */
export function useQuickActions() {
  const triggers = useAtomValue(triggersAtom)
  const servers = useAtomValue(serversAtom)
  const router = useRouter()

  // Sync triggers → quick-action items whenever they change
  useEffect(() => {
    async function sync() {
      const resolved = await resolveTriggers(triggers)
      const resolvedServers = servers instanceof Promise ? await servers : servers

      const items: QuickActions.Action[] = Object.values(resolved)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((t) => ({
          id: t.id,
          title: t.message.length > 40 ? `${t.message.slice(0, 37)}...` : t.message,
          subtitle: resolvedServers[t.serverId]?.name ?? 'Unknown server',
          icon: 'play',
          params: { slug: t.id },
        }))

      await QuickActions.setItems(items)
    }

    sync()
  }, [triggers, servers])

  const handleAction = useCallback(
    async (action: QuickActions.Action) => {
      const slug = (action.params?.slug as string) ?? action.id
      await executeTrigger(slug)

      // Dismiss open modals to reveal the chat screen
      if (router.canDismiss()) {
        router.dismissAll()
      }
    },
    [router],
  )

  // Listen for quick-action presses (foreground + cold start via initial)
  useEffect(() => {
    const subscription = QuickActions.addListener(handleAction)

    // Handle cold-start: if the app was launched via a quick action,
    // QuickActions.initial will be set before the listener is attached.
    if (QuickActions.initial) {
      handleAction(QuickActions.initial)
    }

    return () => {
      subscription.remove()
    }
  }, [handleAction])
}
