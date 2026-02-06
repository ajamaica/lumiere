// ── Trust Tiers ──────────────────────────────────────────────────────────────

export type TrustTier = 'blocked' | 'untrusted' | 'sandboxed' | 'trusted' | 'owner'

export const TRUST_TIER_VALUES: Record<TrustTier, number> = {
  blocked: 0,
  untrusted: 1,
  sandboxed: 2,
  trusted: 3,
  owner: 4,
}

export const TRUST_TIER_FROM_VALUE: Record<number, TrustTier> = {
  0: 'blocked',
  1: 'untrusted',
  2: 'sandboxed',
  3: 'trusted',
  4: 'owner',
}

/** Ordered list of tiers for promotion/demotion */
export const TRUST_TIER_ORDER: TrustTier[] = [
  'blocked',
  'untrusted',
  'sandboxed',
  'trusted',
  'owner',
]

// ── Configuration Types ─────────────────────────────────────────────────────

export type AutoPromoteConfig = {
  enabled: boolean
  untrusted_to_sandboxed?: { interactions: number }
  sandboxed_to_trusted?: { interactions: number; requireApproval?: boolean }
}

export type TrustAgentMapping = Record<string, TrustTier>

export type TrustConfig = {
  default: TrustTier
  agents: TrustAgentMapping
  autoPromote?: AutoPromoteConfig
}

export type SessionTierConfig = {
  model?: string
  historyLimit?: number
  systemPrompt?: string
  tools?: {
    allow?: string[]
    deny?: string[]
  }
  maxTurnsPerDay?: number
  autoExpireMinutes?: number
}

export type SessionConfig = {
  owner?: SessionTierConfig
  trusted?: SessionTierConfig
  sandboxed?: SessionTierConfig
  untrusted?: SessionTierConfig
}

export type PollingConfig = {
  intervalMs?: number
  activeIntervalMs?: number
  idleIntervalMs?: number
}

export type WebhookConfig = {
  path?: string
  secret?: string
}

export type RateLimitConfig = {
  maxPerMinute: number
}

export type RateLimitsConfig = {
  global?: RateLimitConfig
  perAgent?: RateLimitConfig
  untrusted?: RateLimitConfig
}

export type NoChatConfig = {
  enabled?: boolean
  serverUrl: string
  apiKey: string
  agentName: string
  agentId?: string
  transport?: 'auto' | 'polling' | 'webhook' | 'websocket'
  polling?: PollingConfig
  webhook?: WebhookConfig
  trust: TrustConfig
  sessions?: SessionConfig
  rateLimits?: RateLimitsConfig
}

// ── Message Types ───────────────────────────────────────────────────────────

export type NoChatMessage = {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  encrypted_content: string // base64-encoded
  message_type: 'text' | 'file' | 'system'
  created_at: string // ISO 8601
}

export type NoChatConversation = {
  id: string
  type: 'direct' | 'group'
  participant_ids: string[]
  last_message_at?: string
  updated_at?: string
  created_at: string
}

// ── Resolved Account ────────────────────────────────────────────────────────

export type ResolvedNoChatAccount = {
  accountId: string
  name: string
  enabled: boolean
  configured: boolean
  config: NoChatConfig
  baseUrl: string
}

// ── Trust Store State ───────────────────────────────────────────────────────

export type TrustStoreState = {
  interactionCounts: Record<string, number>
  runtimeOverrides: Record<string, TrustTier>
  pendingPromotions: Record<string, TrustTier> // agents flagged for manual approval
}

// ── Transport ───────────────────────────────────────────────────────────────

export type InboundMessageHandler = (message: NoChatMessage) => void | Promise<void>
