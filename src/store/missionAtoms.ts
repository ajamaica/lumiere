import { atomWithStorage } from 'jotai/utils'

import type { MissionsDict } from './missionTypes'
import { storage } from './storage'

/** All missions keyed by ID */
export const missionsAtom = atomWithStorage<MissionsDict>('missions', {}, storage)

/** Currently viewed/active mission ID */
export const activeMissionIdAtom = atomWithStorage<string | null>('activeMissionId', null, storage)
