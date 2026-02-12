import { atomWithStorage } from 'jotai/utils'

import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface WorkflowFile {
  uri: string // Content URI / file path
  name: string // Display name
  mimeType: string
  size: number // bytes
  addedAt: number
}

export interface WorkflowConfig {
  enabled: boolean
  files: WorkflowFile[]
}

export interface WorkflowConfigMap {
  [sessionKey: string]: WorkflowConfig
}

// ─── Atoms ───────────────────────────────────────────────

/** Per-session workflow document context configuration */
export const workflowConfigAtom = atomWithStorage<WorkflowConfigMap>('workflowConfig', {}, storage)
