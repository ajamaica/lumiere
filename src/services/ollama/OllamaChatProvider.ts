import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  ProviderConfig,
  SendMessageParams,
} from '../providers/types'

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
}

interface OllamaChatStreamChunk {
  model: string
  created_at: string
  message: { role: string; content: string }
  done: boolean
}

/**
 * Chat provider for Ollama's local HTTP API.
 *
 * Ollama exposes a REST API at http://localhost:11434 by default.
 * This provider uses the /api/chat endpoint with streaming support
 * and maintains an in-memory conversation history per session.
 */
export class OllamaChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private baseUrl: string
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []

  // In-memory conversation history keyed by session
  private sessions: Map<string, OllamaMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    // Normalize URL: strip trailing slash, ensure no /api suffix yet
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.model = config.model || 'llama3.2'
  }

  async connect(): Promise<void> {
    // Verify Ollama is reachable by hitting the tags endpoint
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`)
      }
      this.connected = true
      this.notifyConnectionState(true, false)
    } catch (error) {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(
        `Cannot connect to Ollama at ${this.baseUrl}. ` +
          `Make sure Ollama is running (ollama serve).`,
      )
    }
  }

  disconnect(): void {
    this.connected = false
    this.notifyConnectionState(false, false)
  }

  isConnected(): boolean {
    return this.connected
  }

  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean) => void,
  ): () => void {
    this.connectionListeners.push(listener)
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener)
    }
  }

  private notifyConnectionState(connected: boolean, reconnecting: boolean) {
    this.connectionListeners.forEach((l) => l(connected, reconnecting))
  }

  private getSessionMessages(sessionKey: string): OllamaMessage[] {
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, [])
    }
    return this.sessions.get(sessionKey)!
  }

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const messages = this.getSessionMessages(params.sessionKey)

    // Build the user message
    const userMsg: OllamaMessage = {
      role: 'user',
      content: params.message,
    }

    // Ollama supports images as base64 strings in the `images` field
    if (params.attachments?.length) {
      userMsg.images = params.attachments
        .filter((a) => a.type === 'image' && a.data)
        .map((a) => a.data!)
    }

    messages.push(userMsg)

    // Signal lifecycle start
    onEvent({ type: 'lifecycle', phase: 'start' })

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama error (${response.status}): ${errorText}`)
      }

      // Read the streaming NDJSON response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete JSON lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const chunk: OllamaChatStreamChunk = JSON.parse(trimmed)

            if (chunk.message?.content) {
              fullResponse += chunk.message.content
              onEvent({ type: 'delta', delta: chunk.message.content })
            }

            if (chunk.done) {
              // Store assistant response in session history
              messages.push({ role: 'assistant', content: fullResponse })
              onEvent({ type: 'lifecycle', phase: 'end' })
              return
            }
          } catch {
            // Skip malformed JSON lines
            console.warn('Ollama: skipping malformed chunk:', trimmed)
          }
        }
      }

      // If we exit the loop without a done=true chunk, still finalize
      if (fullResponse) {
        messages.push({ role: 'assistant', content: fullResponse })
      }
      onEvent({ type: 'lifecycle', phase: 'end' })
    } catch (error) {
      onEvent({ type: 'lifecycle', phase: 'end' })
      throw error
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        role: m.role as 'user' | 'assistant',
        content: [{ type: 'text', text: m.content }],
        timestamp: Date.now() - (sliced.length - i) * 1000, // Approximate timestamps
      }))

    return { messages: historyMessages }
  }

  async resetSession(sessionKey: string): Promise<void> {
    this.sessions.delete(sessionKey)
  }

  async listSessions(): Promise<unknown> {
    return {
      sessions: Array.from(this.sessions.keys()).map((key) => ({
        key,
        messageCount: this.sessions.get(key)?.length ?? 0,
      })),
    }
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (response.ok) {
        return { status: 'healthy' }
      }
      return { status: 'degraded' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
