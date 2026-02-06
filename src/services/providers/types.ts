// Abstract Chat Provider types
// Shared interface that all chat providers (Molt, Ollama, etc.) must implement

export type ProviderType =
  | 'molt'
  | 'ollama'
  | 'echo'
  | 'apple'
  | 'claude'
  | 'openai'
  | 'openrouter'
  | 'gemini-nano'
  | 'emergent'

export interface ProviderConfig {
  type: ProviderType
  url: string
  token: string // Molt requires token; Ollama may not
  clientId?: string
  model?: string // Ollama model name (e.g., 'llama3', 'mistral')
  serverId?: string // Server UUID for cache isolation
}

export interface ChatProviderEvent {
  type: 'delta' | 'lifecycle' | 'image'
  /** Incremental text chunk (for type === 'delta') */
  delta?: string
  /** Lifecycle phase (for type === 'lifecycle') */
  phase?: 'start' | 'end'
  /** Generated image data (for type === 'image') */
  image?: {
    url: string // base64 data URI (e.g. data:image/png;base64,...)
    revisedPrompt?: string
  }
}

export interface SendMessageParams {
  message: string
  sessionKey: string
  attachments?: ProviderAttachment[]
}

export interface ProviderAttachment {
  type: 'image'
  data?: string // base64
  mimeType?: string
}

export interface ChatHistoryContentItem {
  type: string
  text?: string
  /** Base64 data URI for generated images (e.g. data:image/png;base64,...) */
  image_url?: string
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: ChatHistoryContentItem[]
  timestamp: number
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[]
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
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
  /** AI image generation (e.g. DALL-E, gpt-image-1) */
  imageGeneration: boolean
  /** Server-side session persistence (list / switch / reset) */
  serverSessions: boolean
  /** Persistent chat history that survives app restarts */
  persistentHistory: boolean
  /** Cron job / scheduler management */
  scheduler: boolean
  /** Gateway snapshot with presence & instance info */
  gatewaySnapshot: boolean
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
