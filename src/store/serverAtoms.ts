import { atomWithStorage } from 'jotai/utils'

import type { ProviderType } from '../services/providers/types'
import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface ServerConfig {
  id: string // UUID
  name: string // User-friendly name
  url: string
  clientId?: string
  providerType: ProviderType // 'molt' | 'ollama'
  model?: string // Model name for Ollama (e.g., 'llama3.2', 'mistral')
  createdAt: number
}

export interface ServersDict {
  [uuid: string]: ServerConfig
}

// ─── Atoms ───────────────────────────────────────────────

/** Multi-server storage: UUID → ServerConfig mapping */
export const serversAtom = atomWithStorage<ServersDict>('servers', {}, storage)

/** Currently selected server ID */
export const currentServerIdAtom = atomWithStorage<string>('currentServerId', '', storage)
