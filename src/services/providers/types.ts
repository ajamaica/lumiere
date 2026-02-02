// Abstract Chat Provider types
// Shared interface that all chat providers (Molt, Ollama, etc.) must implement

export type ProviderType = 'molt' | 'ollama'

export interface ProviderConfig {
  type: ProviderType
  url: string
  token: string // Molt requires token; Ollama may not
  clientId?: string
  model?: string // Ollama model name (e.g., 'llama3', 'mistral')
}

export interface ChatProviderEvent {
  type: 'delta' | 'lifecycle'
  /** Incremental text chunk (for type === 'delta') */
  delta?: string
  /** Lifecycle phase (for type === 'lifecycle') */
  phase?: 'start' | 'end'
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

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: Array<{ type: string; text?: string }>
  timestamp: number
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[]
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
}

/**
 * Abstract interface for any chat provider.
 *
 * Both Molt Gateway (WebSocket) and Ollama (HTTP streaming) implement this
 * interface, allowing the UI layer to be provider-agnostic.
 */
export interface ChatProvider {
  /** Establish connection to the backend */
  connect(): Promise<void>

  /** Disconnect / clean up resources */
  disconnect(): void

  /** Whether the provider is currently connected and ready */
  isConnected(): boolean

  /** Register a listener for connection state changes */
  onConnectionStateChange(listener: (connected: boolean, reconnecting: boolean) => void): () => void

  /** Send a chat message and receive streaming events */
  sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void>

  /** Retrieve chat history for a session */
  getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse>

  /** Reset / clear a session */
  resetSession(sessionKey: string): Promise<void>

  /** List available sessions */
  listSessions(): Promise<unknown>

  /** Get provider health status */
  getHealth(): Promise<HealthStatus>
}
