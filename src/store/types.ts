import type { ProviderType } from '../services/providers/types'

// ─── Server types ────────────────────────────────────────

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

// ─── Session types ───────────────────────────────────────

export interface ServerSessions {
  [serverUuid: string]: string // session key for each server
}

export interface SessionAliases {
  [sessionKey: string]: string // display name for each session
}

export interface SessionContextConfig {
  systemMessage: string
}

export interface SessionContextMap {
  [sessionKey: string]: SessionContextConfig
}

// ─── User data types ─────────────────────────────────────

export interface FavoriteItem {
  id: string
  text: string
  sender: 'user' | 'agent'
  savedAt: number
}

export interface TriggerConfig {
  id: string // Random 8-char slug used in the deep link URL
  message: string // Message to auto-send when the trigger fires
  sessionKey: string // Session key to send the message in
  serverId: string // Server to send it on
  createdAt: number
}

export interface TriggersDict {
  [slug: string]: TriggerConfig
}

// ─── Notification types ──────────────────────────────────

/** Tracks the last message timestamp seen from each server gateway session */
export interface GatewayLastSeenMap {
  [serverSessionKey: string]: number
}

// ─── Messaging types ────────────────────────────────────

export interface PendingShareMedia {
  uri: string
  mimeType: string
  fileName?: string
}
