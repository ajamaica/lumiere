import { useAtomValue } from 'jotai'
import { useEffect } from 'react'

import {
  isAvailable,
  setDynamicShortcuts,
  updatePinnedShortcuts,
} from '../../modules/android-shortcuts'
import { serversAtom, type TriggerConfig, triggersAtom } from '../store'

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
 * Syncs user-created triggers to Android dynamic shortcuts and keeps
 * pinned shortcuts up to date.
 *
 * Static shortcuts (New Chat, Triggers, Settings) are defined in
 * shortcuts.xml and managed by the system — no JS sync needed.
 *
 * Call once in the root layout alongside useQuickActions.
 */
export function useAndroidShortcuts() {
  const triggers = useAtomValue(triggersAtom)
  const servers = useAtomValue(serversAtom)

  useEffect(() => {
    if (!isAvailable()) return

    async function sync() {
      const resolved = await resolveTriggers(triggers)
      const resolvedServers = servers instanceof Promise ? await servers : servers

      const shortcuts = Object.values(resolved)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((t) => ({
          id: t.id,
          shortLabel: t.message.length > 25 ? `${t.message.slice(0, 22)}...` : t.message,
          longLabel: `${t.message.length > 40 ? `${t.message.slice(0, 37)}...` : t.message} — ${resolvedServers[t.serverId]?.name ?? 'Unknown'}`,
          uri: `lumiere://trigger/autotrigger/${t.id}`,
        }))

      // Update dynamic shortcuts (shown on long-press alongside static ones)
      await setDynamicShortcuts(shortcuts)

      // Also update any pinned shortcuts that still exist on the home screen
      if (shortcuts.length > 0) {
        await updatePinnedShortcuts(shortcuts)
      }
    }

    sync()
  }, [triggers, servers])
}
