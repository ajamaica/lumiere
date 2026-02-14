// Abstract Chat Provider types
// Shared interface that all chat providers (Molt, Ollama, etc.) must implement

export type ProviderType =
  | 'molt'
  | 'ollama'
  | 'echo'
  | 'apple'
  | 'claude'
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'gemini-nano'
  | 'gemini'
  | 'kimi'

export interface ProviderConfig {
  type: ProviderType
  url: string
  token: string // Molt requires token; Ollama may not
  password?: string // Optional gateway password for Molt
  clientId?: string
  model?: string // Ollama model name (e.g., 'llama3', 'mistral')
  serverId?: string // Server UUID for cache isolation
}

/** A file attachment received from the server during an agent response. */
export interface ReceivedFileAttachment {
  type: string
  mimeType: string
  fileName: string
  /** base64-encoded file content */
  content: string
}

export interface ChatProviderEvent {
  type: 'delta' | 'lifecycle' | 'tool_event' | 'file_attachment'
  /** Incremental text chunk (for type === 'delta') */
  delta?: string
  /** Lifecycle phase (for type === 'lifecycle') */
  phase?: 'start' | 'end'
  /** Tool name (for type === 'tool_event') */
  toolName?: string
  /** Tool call ID (for type === 'tool_event') */
  toolCallId?: string
  /** Tool input parameters (for type === 'tool_event') */
  toolInput?: Record<string, unknown>
  /** Tool execution status (for type === 'tool_event') */
  toolStatus?: 'running' | 'completed' | 'error'
  /** File attachments transferred back from the agent (for type === 'file_attachment') */
  fileAttachments?: ReceivedFileAttachment[]
}

export interface SendMessageParams {
  message: string
  sessionKey: string
  attachments?: ProviderAttachment[]
  /** Optional system message injected as hidden context for the session.
   *  Each provider uses its native mechanism (e.g. system role, system_instruction). */
  systemMessage?: string
}

export interface ProviderAttachment {
  type: 'image' | 'document' | 'audio' | 'video'
  data?: string // base64
  mimeType?: string
  name?: string
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: Array<{ type: string; text?: string }>
  timestamp: number
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[]
}

export interface AgentInfo {
  available: boolean
  error?: string
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  agents?: Record<string, AgentInfo>
}

/**
 * Declares which features a provider supports.
 *
 * The UI uses this to conditionally show/hide controls
 * (e.g. hide the image-attach button when imageAttachments is false).
 */
export interface ProviderCapabilities {
  /** Basic text chat (all providers must support this) */
  chat: boolean
  /** Sending image attachments alongside messages */
  imageAttachments: boolean
  /** Sending file/document attachments alongside messages */
  fileAttachments: boolean
  /** Server-side session persistence (list / switch / reset) */
  serverSessions: boolean
  /** Persistent chat history that survives app restarts */
  persistentHistory: boolean
  /** Cron job / scheduler management */
  scheduler: boolean
  /** Gateway snapshot with presence & instance info */
  gatewaySnapshot: boolean
  /** Skills management (teach, list, remove) */
  skills: boolean
}

/**
 * Abstract interface for any chat provider.
 *
 * Both Molt Gateway (WebSocket) and Ollama (HTTP streaming) implement this
 * interface, allowing the UI layer to be provider-agnostic.
 */
export interface ChatProvider {
  /** The set of features this provider supports */
  capabilities: ProviderCapabilities

  /** Establish connection to the backend */
  connect(): Promise<void>

  /** Disconnect / clean up resources */
  disconnect(): void

  /** Whether the provider is currently connected and ready */
  isConnected(): boolean

  /** Register a listener for connection state changes */
  onConnectionStateChange(listener: (connected: boolean, reconnecting: boolean) => void): () => void

  /** Send a chat message and receive streaming events */
  sendMessage(params: SendMessageParams, onEvent: (event: ChatProviderEvent) => void): Promise<void>

  /** Retrieve chat history for a session */
  getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse>

  /** Reset / clear a session */
  resetSession(sessionKey: string): Promise<void>

  /** List available sessions */
  listSessions(): Promise<unknown>

  /** Get provider health status */
  getHealth(): Promise<HealthStatus>
}
