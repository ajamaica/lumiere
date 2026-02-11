// Molt Gateway Protocol Types

export interface MoltConfig {
  url: string
  token: string
  clientId?: string
}

// Protocol versions (now configured in gateway.config.ts)

// Frame types
export type FrameType = 'req' | 'res' | 'event'

// Base frame structure
export interface BaseFrame {
  type: FrameType
}

// Request frame
export interface RequestFrame extends BaseFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

// Response frame
export interface ResponseFrame extends BaseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: GatewayError
}

// Event frame
export interface EventFrame extends BaseFrame {
  type: 'event'
  event: string
  payload?: unknown
}

// Error structure
export interface GatewayError {
  code: string
  message: string
  details?: unknown
  retryable?: boolean
  retryAfterMs?: number
}

// Connect request
export interface ConnectParams {
  minProtocol: number
  maxProtocol: number
  role?: string
  device?: {
    id: string
    name?: string
  }
  caps?: string[]
  auth?: {
    token?: string
    password?: string
  }
  locale?: string
}

// Gateway snapshot
export interface GatewaySnapshot {
  tickInterval?: number
  lastChannelsRefresh?: number
  connectedAt?: number
  uptime?: number
  uptimeMs?: number
  health?: {
    sessions?: {
      count?: number
    }
  }
  presence?: Array<{
    host?: string
    ts?: number
    mode?: string
  }>
}

// Connect response
export interface ConnectResponse {
  protocol: number
  gateway: {
    version: string
    capabilities?: string[]
  }
  snapshot?: GatewaySnapshot
}

// Health status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  channels?: Record<string, ChannelStatus>
  agents?: Record<string, AgentStatus>
}

export interface ChannelStatus {
  connected: boolean
  error?: string
}

export interface AgentStatus {
  available: boolean
  error?: string
}

// Send message params
export interface SendMessageParams {
  channel: string
  text: string
  attachments?: Attachment[]
}

// Chat history params
export interface ChatHistoryParams {
  sessionKey: string
  limit?: number
}

// Chat message from history — re-exported from the shared provider types
// to keep backwards compatibility for any molt-specific imports.
export type { ChatHistoryMessage } from '../providers/types'

export interface Attachment {
  type: 'image' | 'audio' | 'video' | 'document'
  url?: string
  data?: string
  mimeType?: string
  fileName?: string
}

// Attachment format accepted by the gateway chat.send RPC method.
// The `content` field must be a data-URI (e.g. "data:image/png;base64,…").
export interface ChatSendAttachment {
  type: 'image' | 'audio' | 'video' | 'document'
  mimeType: string
  content: string // data-URI
  fileName?: string
}

// Params for the chat.send RPC method
export interface ChatSendParams {
  message: string
  idempotencyKey: string
  agentId?: string
  sessionKey?: string
  model?: string
  attachments?: ChatSendAttachment[]
}

// Agent params
export interface AgentParams {
  message: string
  idempotencyKey: string
  agentId?: string
  sessionKey?: string
  model?: string
  attachments?: Attachment[]
}

// Agent events
export type AgentEvent = {
  data: {
    delta?: string
    text?: string
    phase?: 'start' | 'end'
    startedAt?: number
    endedAt?: number
  }
  runId: string
  seq: number
  sessionKey: string
  stream: 'assistant' | 'lifecycle' | 'tool'
  ts: number
}

// Skills types
export interface TeachSkillParams {
  name: string
  description: string
  content: string
}

export interface UpdateSkillParams {
  name: string
  description?: string
  content?: string
}

export interface Skill {
  name: string
  description: string
  content: string
  createdAtMs: number
  updatedAtMs: number
}

export interface SkillsListResponse {
  skills: Skill[]
}

// ClawHub types
export interface ClawHubSkill {
  slug: string
  name: string
  description: string
  content: string
  author?: string
  installs?: number
}

// Event types
export type GatewayEvent =
  | { event: 'agent'; payload: AgentEvent; seq?: number }
  | { event: 'presence'; payload: unknown }
  | { event: 'tick'; payload: { timestamp: number } }
  | { event: 'shutdown'; payload: { restartIn?: number } }
