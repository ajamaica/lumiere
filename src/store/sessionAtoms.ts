import { atomWithStorage } from 'jotai/utils'

import { DEFAULT_SESSION_KEY } from '../constants'
import { storage } from './storeUtils'

// ─── Types ───────────────────────────────────────────────

export interface ServerSessions {
  [serverUuid: string]: string // session key for each server
}

export interface SessionAliases {
  [sessionKey: string]: string // display name for each session
}

// ─── Atoms ───────────────────────────────────────────────

/** Tracks which session key each server is using */
export const serverSessionsAtom = atomWithStorage<ServerSessions>('serverSessions', {}, storage)

/** The currently active session key (format: `agent:<agentId>:<sessionName>`) */
export const currentSessionKeyAtom = atomWithStorage<string>(
  'currentSessionKey',
  DEFAULT_SESSION_KEY,
  storage,
)

/** Current agent ID for OpenClaw (Molt) provider */
export const currentAgentIdAtom = atomWithStorage<string>('currentAgentId', 'main', storage)

/** Local display names for session keys */
export const sessionAliasesAtom = atomWithStorage<SessionAliases>('sessionAliases', {}, storage)
