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

interface ClaudieMessage {
  role: 'user' | 'assistant'
  content: string | ClaudieContentBlock[]
}

interface ClaudieContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ClaudieStreamEvent {
  type: string
  delta?: {
    type: string
    text?: string
  }
  content_block?: {
    type: string
    text?: string
  }
  message?: {
    id: string
    content: ClaudieContentBlock[]
  }
  error?: {
    type: string
    message: string
  }
}

/**
 * Chat provider for Claudie API (Anthropic Claude API compatible).
 *
 * Uses the Anthropic Messages API format with streaming support
 * for real-time response delivery.
 */
export class ClaudieChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: true,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private baseUrl: string
  private apiKey: string
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private abortController: AbortController | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, ClaudieMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || 'claude-sonnet-4-5-20250514'
  }

  async connect(): Promise<void> {
    try {
      // Verify connection by making a simple request
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })

      if (!response.ok && response.status !== 400) {
        throw new Error(`API returned status ${response.status}`)
      }

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(`Cannot connect to Claudie API. Check your API key and endpoint.`)
    }
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
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

  private getSessionMessages(sessionKey: string): ClaudieMessage[] {
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

    // Build the user message content
    const contentBlocks: ClaudieContentBlock[] = []

    // Add text content
    if (params.message) {
      contentBlocks.push({ type: 'text', text: params.message })
    }

    // Add image attachments if present
    if (params.attachments?.length) {
      for (const attachment of params.attachments) {
        if (attachment.type === 'image' && attachment.data) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType || 'image/png',
              data: attachment.data,
            },
          })
        }
      }
    }

    const userMsg: ClaudieMessage = {
      role: 'user',
      content:
        contentBlocks.length === 1 && contentBlocks[0].type === 'text'
          ? contentBlocks[0].text!
          : contentBlocks,
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8192,
          messages: messages.map(this.formatMessageForApi),
          stream: true,
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const event: ClaudieStreamEvent = JSON.parse(data)

              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullResponse += event.delta.text
                onEvent({ type: 'delta', delta: event.delta.text })
              } else if (event.type === 'error') {
                throw new Error(event.error?.message || 'Stream error')
              }
            } catch (e) {
              // Skip malformed JSON lines
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
      }

      if (fullResponse) {
        messages.push({ role: 'assistant', content: fullResponse })
      }

      onEvent({ type: 'lifecycle', phase: 'end' })
    } catch (error) {
      onEvent({ type: 'lifecycle', phase: 'end' })
      throw error
    } finally {
      this.abortController = null
    }
  }

  private formatMessageForApi(msg: ClaudieMessage): { role: string; content: unknown } {
    return {
      role: msg.role,
      content: msg.content,
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced.map((m, i) => ({
      role: m.role,
      content: [{ type: 'text', text: this.extractTextContent(m.content) }],
      timestamp: Date.now() - (sliced.length - i) * 1000,
    }))

    return { messages: historyMessages }
  }

  private extractTextContent(content: string | ClaudieContentBlock[]): string {
    if (typeof content === 'string') {
      return content
    }
    const textBlocks = content.filter((b) => b.type === 'text' && b.text)
    return textBlocks.map((b) => b.text).join('\n')
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
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      })

      if (response.ok || response.status === 400) {
        return { status: 'healthy' }
      }
      return { status: 'degraded' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
