import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'
import type { NotificationLastCheckMap } from './types'

/** Whether background notifications are enabled (off by default) */
export const backgroundNotificationsEnabledAtom = atomWithStorage<boolean>(
  'backgroundNotificationsEnabled',
  false,
  storage,
)

/** Whether Android chat bubbles are enabled (off by default, Android 11+ only) */
export const chatBubblesEnabledAtom = atomWithStorage<boolean>('chatBubblesEnabled', false, storage)

/** Interval in minutes for background fetch checks (default 15 min) */
export const backgroundFetchIntervalAtom = atomWithStorage<number>(
  'backgroundFetchInterval',
  15,
  storage,
)

/** Last notification check timestamps keyed by serverSessionKey */
export const notificationLastCheckAtom = atomWithStorage<NotificationLastCheckMap>(
  'notifications_last_check',
  {},
  storage,
)
