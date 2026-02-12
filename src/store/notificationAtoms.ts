import { atomWithStorage } from 'jotai/utils'

import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface NotificationLastCheckMap {
  [serverSessionKey: string]: number
}

// ─── Atoms ───────────────────────────────────────────────

/** Whether background notification polling is enabled */
export const backgroundNotificationsEnabledAtom = atomWithStorage<boolean>(
  'backgroundNotificationsEnabled',
  false,
  storage,
)

/** Interval in minutes for background fetch checks */
export const backgroundFetchIntervalAtom = atomWithStorage<number>(
  'backgroundFetchInterval',
  15,
  storage,
)

/** Last notification check timestamp per server-session key */
export const notificationLastCheckAtom = atomWithStorage<NotificationLastCheckMap>(
  'notifications_last_check',
  {},
  storage,
)
