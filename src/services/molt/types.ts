// Molt Gateway Protocol Types

// ─── Connection ─────────────────────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface MoltConfig {
  url: string
  token: string
  password?: string
  clientId?: string
  /** Auto-reconnect on unexpected close (default true) */
  autoReconnect?: boolean
  /** Default request timeout in ms (default 15 000) */
  defaultTimeoutMs?: number
}

// ─── Frame Types ────────────────────────────────────────────────────────────────

export type FrameType = 'req' | 'res' | 'event'

export interface BaseFrame {
  type: FrameType
}

export interface RequestFrame extends BaseFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface ResponseFrame extends BaseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: GatewayErrorShape
}

export interface EventFrame extends BaseFrame {
  type: 'event'
  event: string
  seq?: number
  payload?: unknown
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame

// ─── Errors ─────────────────────────────────────────────────────────────────────

/** Wire-format error shape returned by the gateway. */
export interface GatewayErrorShape {
  code: string
  message: string
  details?: unknown
  retryable?: boolean
  retryAfterMs?: number
}

/** Typed error class for gateway failures. */
export class GatewayError extends Error {
  public readonly code: string
  public readonly details?: unknown
  public readonly retryable?: boolean
  public readonly retryAfterMs?: number

  constructor(error: GatewayErrorShape) {
    super(error.message)
    this.name = 'GatewayError'
    this.code = error.code
    this.details = error.details
    this.retryable = error.retryable
    this.retryAfterMs = error.retryAfterMs
  }
}

// ─── Pending Request ────────────────────────────────────────────────────────────

export interface PendingRequest {
  resolve: (payload: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// ─── Connect ────────────────────────────────────────────────────────────────────

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

export interface ConnectResponse {
  protocol: number
  gateway: {
    version: string
    capabilities?: string[]
  }
  snapshot?: GatewaySnapshot
  tickIntervalMs?: number
}

// ─── Health ─────────────────────────────────────────────────────────────────────

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

// ─── Chat / Messages ────────────────────────────────────────────────────────────

export interface SendMessageParams {
  channel: string
  text: string
  attachments?: Attachment[]
}

export interface ChatHistoryParams {
  sessionKey: string
  limit?: number
}

// Re-export from shared provider types for backwards compatibility.
export type { ChatHistoryMessage } from '../providers/types'

export interface Attachment {
  type: 'image' | 'audio' | 'video' | 'document'
  url?: string
  data?: string
  mimeType?: string
  fileName?: string
}

/**
 * Wire-format attachment for `chat.send` — matches the gateway protocol.
 * All fields are required so the server can process the file correctly.
 */
export interface ChatAttachmentPayload {
  type: string
  mimeType: string
  fileName: string
  /** base64-encoded file content */
  content: string
}

export interface ChatSendResponse {
  runId: string
  status: string
}

// ─── Agent ──────────────────────────────────────────────────────────────────────

export interface AgentParams {
  message: string
  idempotencyKey: string
  agentId?: string
  sessionKey?: string
  model?: string
  attachments?: Attachment[]
}

export type AgentEvent = {
  data: {
    delta?: string
    text?: string
    phase?: 'start' | 'end'
    startedAt?: number
    endedAt?: number
    /** Tool name for stream === 'tool' events (e.g. 'web_fetch', 'code_execution') */
    toolName?: string
    /** Tool input parameters (e.g. { url: '...' } for web_fetch) */
    toolInput?: Record<string, unknown>
    /** Status of the tool invocation */
    toolStatus?: 'running' | 'completed' | 'error'
    /** Unique ID correlating start/end events for the same tool call */
    toolCallId?: string
  }
  runId: string
  seq: number
  sessionKey: string
  stream: 'assistant' | 'lifecycle' | 'tool'
  ts: number
}

// ─── Skills ─────────────────────────────────────────────────────────────────────

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

export interface ClawHubSkill {
  slug: string
  name: string
  description: string
  content: string
  author?: string
  installs?: number
}

// ─── Logs ───────────────────────────────────────────────────────────────────────

export interface GatewayLogEntry {
  ts: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  source?: string
  meta?: Record<string, unknown>
}

export interface GatewayLogsParams {
  /** Maximum number of log entries to return. */
  limit?: number
  /** Maximum response size in bytes. */
  maxBytes?: number
  /** Pagination cursor returned by a previous logs.tail response. */
  cursor?: number
  /** Filter by log level. */
  level?: 'debug' | 'info' | 'warn' | 'error'
}

export interface GatewayLogsResponse {
  logs: GatewayLogEntry[]
  /** Cursor for fetching the next page of logs. */
  cursor?: number
}

// ─── Event Listener Types ───────────────────────────────────────────────────────

export type EventCallback = (payload: unknown) => void
export type ConnectionStateCallback = (state: ConnectionState) => void
export type AgentEventCallback = (event: AgentEvent) => void

// ─── Wire Event Union ───────────────────────────────────────────────────────────

export type GatewayEvent =
  | { event: 'agent'; payload: AgentEvent; seq?: number }
  | { event: 'presence'; payload: unknown }
  | { event: 'tick'; payload: { timestamp: number } }
  | { event: 'shutdown'; payload: { restartIn?: number } }
  | { event: 'health'; payload: HealthStatus }
  | { event: 'seq.gap'; payload: { expected: number; received: number } }
