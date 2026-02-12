import { atomWithStorage } from 'jotai/utils'

import { DEFAULT_SESSION_KEY } from '../constants'
import { storage } from './storage'
import type { ServerSessions, SessionAliases, SessionContextMap } from './types'

// ─── Session key utilities ───────────────────────────────

export interface SessionKeyParts {
  agentId: string
  sessionName: string
}

/**
 * Create a session key from its component parts.
 * Session keys follow the format: `agent:<agentId>:<sessionName>`
 */
export function createSessionKey(agentId: string, sessionName: string): string {
  return `agent:${agentId}:${sessionName}`
}

/**
 * Parse a session key into its component parts.
 * Returns `{ agentId: 'main', sessionName: 'main' }` for malformed keys.
 */
export function parseSessionKey(key: string): SessionKeyParts {
  const parts = key.split(':')
  return {
    agentId: parts.length >= 2 ? parts[1] : 'main',
    sessionName: parts.length >= 3 ? parts[2] : 'main',
  }
}

// ─── Session atoms ───────────────────────────────────────

/** Current session key with persistent storage */
export const currentSessionKeyAtom = atomWithStorage<string>(
  'currentSessionKey',
  DEFAULT_SESSION_KEY,
  storage,
)

/** Maps each server UUID to its active session key */
export const serverSessionsAtom = atomWithStorage<ServerSessions>('serverSessions', {}, storage)

/** Display names for session keys */
export const sessionAliasesAtom = atomWithStorage<SessionAliases>('sessionAliases', {}, storage)

/** Current agent ID for OpenClaw (Molt) provider */
export const currentAgentIdAtom = atomWithStorage<string>('currentAgentId', 'main', storage)

/** Per-session system message (hidden context) */
export const sessionContextAtom = atomWithStorage<SessionContextMap>('sessionContext', {}, storage)
