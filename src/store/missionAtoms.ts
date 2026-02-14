import { atomWithStorage, unwrap } from 'jotai/utils'

import type { MissionsDict } from './missionTypes'
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
