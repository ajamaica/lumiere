import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'
import type { GatewayLastSeenMap } from './types'

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

/** Last seen message timestamp per server+session from the gateway history */
export const gatewayLastSeenTimestampAtom = atomWithStorage<GatewayLastSeenMap>(
  'gateway_last_seen_timestamps',
  {},
  storage,
)
