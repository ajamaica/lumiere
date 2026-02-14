import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'

/** Whether background notifications are enabled (off by default) */
export const backgroundNotificationsEnabledAtom = atomWithStorage<boolean>(
  'backgroundNotificationsEnabled',
  false,
  storage,
)

/** Interval in minutes for background fetch checks (default 15 min) */
export const backgroundFetchIntervalAtom = atomWithStorage<number>(
  'backgroundFetchInterval',
  15,
  storage,
)
