import { API_CONFIG, DEFAULT_MODELS } from '../../constants'
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

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ClaudeContentBlock[]
}

interface ClaudeContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ClaudeStreamEvent {
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
    content: ClaudeContentBlock[]
  }
  error?: {
    type: string
    message: string
  }
}

/**
 * Chat provider for Claude API (Anthropic Claude API compatible).
 *
 * Uses the Anthropic Messages API format with streaming support
 * for real-time response delivery.
 */
export class ClaudeChatProvider implements ChatProvider {
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
  private sessions: Map<string, ClaudeMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.CLAUDE
  }

  async connect(): Promise<void> {
    try {
      // Verify connection using the lightweight models endpoint (no API credits consumed)
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        },
      })

      if (!response.ok && response.status !== 401) {
        throw new Error(`API returned status ${response.status}`)
      }

      // 401 means the endpoint is reachable but the key is invalid;
      // auth errors will surface on first message send.
      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(`Cannot connect to Claude API. Check your API key and endpoint.`)
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

  private getSessionMessages(sessionKey: string): ClaudeMessage[] {
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
    const contentBlocks: ClaudeContentBlock[] = []

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

    const userMsg: ClaudeMessage = {
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
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: API_CONFIG.CLAUDE_MAX_TOKENS,
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
              const event: ClaudeStreamEvent = JSON.parse(data)

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

  private formatMessageForApi(msg: ClaudeMessage): { role: string; content: unknown } {
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

  private extractTextContent(content: string | ClaudeContentBlock[]): string {
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
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        },
      })

      if (response.ok) {
        return { status: 'healthy' }
      }
      return { status: 'degraded' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
