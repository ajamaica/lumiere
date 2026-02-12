import { atomWithStorage } from 'jotai/utils'

import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface TriggerConfig {
  id: string // Random 8-char slug used in the deep link URL
  message: string // Message to auto-send when the trigger fires
  sessionKey: string // Session key to send the message in
  serverId: string // Server to send it on
  createdAt: number
}

export interface TriggersDict {
  [slug: string]: TriggerConfig
}

// ─── Atoms ───────────────────────────────────────────────

/** Persisted trigger configurations keyed by slug */
export const triggersAtom = atomWithStorage<TriggersDict>('triggers', {}, storage)
