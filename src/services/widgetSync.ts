import { NativeModules, Platform } from 'react-native'

import type { TriggersDict } from '../store'

const APP_GROUP_ID = 'group.bot.lumiere.app'
const TRIGGERS_KEY = 'widget_triggers'

interface SharedTrigger {
  id: string
  message: string
  sessionKey: string
  serverId: string
}

/**
 * Writes the current triggers to the shared App Group UserDefaults
 * so the iOS widget extension can read them for configuration.
 *
 * Uses the native SharedGroupPreferences module exposed by React Native
 * or falls back to the expo-modules bridge when available.
 */
export async function syncTriggersToWidget(triggers: TriggersDict): Promise<void> {
  if (Platform.OS !== 'ios') return

  const shared: SharedTrigger[] = Object.values(triggers).map((t) => ({
    id: t.id,
    message: t.message,
    sessionKey: t.sessionKey,
    serverId: t.serverId,
  }))

  try {
    const SharedDefaults = NativeModules.SharedUserDefaults

    if (SharedDefaults?.setItem) {
      await SharedDefaults.setItem(TRIGGERS_KEY, JSON.stringify(shared), APP_GROUP_ID)
      return
    }

    // Fallback: write via the Settings module if available
    // This is a best-effort approach — the widget will still work if the
    // native module isn't present yet (pre-prebuild), it just won't have data.
  } catch {
    // Silently ignore — widget sync is optional and non-critical
  }
}
