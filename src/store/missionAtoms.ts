import { atomWithStorage, unwrap } from 'jotai/utils'

import type { MissionMessagesDict, MissionsDict } from './missionTypes'
import { storage } from './storage'

/** All missions keyed by ID (raw async atom) */
const missionsAsyncAtom = atomWithStorage<MissionsDict>('missions', {}, storage)

/**
 * Unwrapped missions atom that always returns MissionsDict (never a Promise).
 * Falls back to {} before storage hydrates.
 */
export const missionsAtom = unwrap(missionsAsyncAtom, (prev) => prev ?? {})

/** Currently viewed/active mission ID (raw async atom) */
const activeMissionIdAsyncAtom = atomWithStorage<string | null>('activeMissionId', null, storage)

/**
 * Unwrapped active mission ID atom. Falls back to null before hydration.
 */
export const activeMissionIdAtom = unwrap(activeMissionIdAsyncAtom, (prev) => prev ?? null)

/** Chat message history for each mission, persisted separately from mission metadata */
const missionMessagesAsyncAtom = atomWithStorage<MissionMessagesDict>(
  'missionMessages',
  {},
  storage,
)

/**
 * Unwrapped mission messages atom. Falls back to {} before hydration.
 */
export const missionMessagesAtom = unwrap(missionMessagesAsyncAtom, (prev) => prev ?? {})
