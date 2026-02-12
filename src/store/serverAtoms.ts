import { atomWithStorage } from 'jotai/utils'

import { storage } from './storage'
import type { ServersDict } from './types'

/** Server configurations keyed by UUID */
export const serversAtom = atomWithStorage<ServersDict>('servers', {}, storage)

/** Currently active server ID */
export const currentServerIdAtom = atomWithStorage<string>('currentServerId', '', storage)
