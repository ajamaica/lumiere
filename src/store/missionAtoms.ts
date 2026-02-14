import { atom } from 'jotai'
import { atomWithStorage, unwrap } from 'jotai/utils'

import type { MissionMessagesDict, MissionsDict } from './missionTypes'
import { storage } from './storage'

// ─── Missions ───────────────────────────────────────────

const missionsAsyncAtom = atomWithStorage<MissionsDict>('missions', {}, storage)
const missionsUnwrapped = unwrap(missionsAsyncAtom, (prev) => prev ?? {})

/**
 * Typed missions atom. Read always returns MissionsDict; setter's `prev`
 * is narrowed to MissionsDict so callers never need `as MissionsDict` casts.
 */
export const missionsAtom = atom(
  (get) => (get(missionsUnwrapped) ?? {}) as MissionsDict,
  (_get, set, update: MissionsDict | ((prev: MissionsDict) => MissionsDict)) => {
    if (typeof update === 'function') {
      set(missionsUnwrapped, (prev) => update((prev ?? {}) as MissionsDict))
    } else {
      set(missionsUnwrapped, update)
    }
  },
)

// ─── Active Mission ID ──────────────────────────────────

const activeMissionIdAsyncAtom = atomWithStorage<string | null>('activeMissionId', null, storage)
const activeMissionIdUnwrapped = unwrap(activeMissionIdAsyncAtom, (prev) => prev ?? null)

/**
 * Typed active-mission-id atom. Read returns `string | null`; setter's
 * `prev` is narrowed to `string | null`.
 */
export const activeMissionIdAtom = atom(
  (get) => (get(activeMissionIdUnwrapped) as string | null) ?? null,
  (_get, set, update: string | null | ((prev: string | null) => string | null)) => {
    if (typeof update === 'function') {
      set(activeMissionIdUnwrapped, (prev) => update((prev ?? null) as string | null))
    } else {
      set(activeMissionIdUnwrapped, update)
    }
  },
)

// ─── Mission Messages ───────────────────────────────────

const missionMessagesAsyncAtom = atomWithStorage<MissionMessagesDict>(
  'missionMessages',
  {},
  storage,
)
const missionMessagesUnwrapped = unwrap(missionMessagesAsyncAtom, (prev) => prev ?? {})

/**
 * Typed mission-messages atom. Read returns MissionMessagesDict; setter's
 * `prev` is narrowed to MissionMessagesDict.
 */
export const missionMessagesAtom = atom(
  (get) => (get(missionMessagesUnwrapped) ?? {}) as MissionMessagesDict,
  (
    _get,
    set,
    update: MissionMessagesDict | ((prev: MissionMessagesDict) => MissionMessagesDict),
  ) => {
    if (typeof update === 'function') {
      set(missionMessagesUnwrapped, (prev) => update((prev ?? {}) as MissionMessagesDict))
    } else {
      set(missionMessagesUnwrapped, update)
    }
  },
)
