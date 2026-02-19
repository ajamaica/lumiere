import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { AgentConfig } from '../services/molt/types'
import { storage } from './storage'
import type { ServersDict } from './types'

/** Server configurations keyed by UUID */
export const serversAtom = atomWithStorage<ServersDict>('servers', {}, storage)

/** Currently active server ID */
export const currentServerIdAtom = atomWithStorage<string>('currentServerId', '', storage)

/** Agent configs (with identity/emoji) from the Molt server config, keyed by agent ID */
export const agentConfigsAtom = atom<Record<string, AgentConfig>>({})
