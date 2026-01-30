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

// Chat message from history
export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: Array<{ type: string; text?: string }>
  timestamp: number
}

export interface Attachment {
  type: 'image' | 'audio' | 'document'
  url?: string
  data?: string
  mimeType?: string
}

// Agent params
export interface AgentParams {
  message: string
  idempotencyKey: string
  agentId?: string
  sessionKey?: string
  model?: string
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

// Event types
export type GatewayEvent =
  | { event: 'agent'; payload: AgentEvent; seq?: number }
  | { event: 'presence'; payload: unknown }
  | { event: 'tick'; payload: { timestamp: number } }
  | { event: 'shutdown'; payload: { restartIn?: number } }
