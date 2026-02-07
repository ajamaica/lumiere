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
  type: 'text' | 'image' | 'document'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
  title?: string
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
    fileAttachments: true,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
    thinking: false,
  }

  private baseUrl: string
  private apiKey: string
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private activeXhr: XMLHttpRequest | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, ClaudeMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.CLAUDE
  }

  async connect(): Promise<void> {
    try {
      // Verify connection by making a simple request
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })

      if (!response.ok && response.status !== 400) {
        const errorBody = await response.text().catch(() => 'Unable to read error response')
        throw new Error(
          `API returned status ${response.status}. Response: ${errorBody.substring(0, 200)}`,
        )
      }

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch (error) {
      this.connected = false
      this.notifyConnectionState(false, false)

      // Provide detailed error information
      if (error instanceof Error) {
        if (error.message.includes('API returned status')) {
          // API responded but with an error status
          throw new Error(
            `Cannot connect to Claude API at ${this.baseUrl}. ${error.message}. Check your API key and endpoint configuration.`,
          )
        } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
          // Network error (cannot reach endpoint)
          throw new Error(
            `Network error: Cannot reach Claude API at ${this.baseUrl}. ${error.message}. Verify the endpoint URL is correct and accessible.`,
          )
        } else {
          // Other error
          throw new Error(
            `Cannot connect to Claude API: ${error.message}. Check your API key and endpoint.`,
          )
        }
      }

      // Fallback for non-Error objects
      throw new Error(
        `Cannot connect to Claude API at ${this.baseUrl}. Check your API key and endpoint.`,
      )
    }
  }

  disconnect(): void {
    if (this.activeXhr) {
      this.activeXhr.abort()
      this.activeXhr = null
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

    // Add image and document attachments if present
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
        } else if (attachment.type === 'document' && attachment.data) {
          contentBlocks.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: attachment.mimeType || 'application/pdf',
              data: attachment.data,
            },
            title: attachment.name,
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

    // Use XMLHttpRequest for streaming — React Native's fetch does not
    // support response.body ReadableStream, so XHR with onprogress is
    // the reliable way to receive incremental SSE data.
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      this.activeXhr = xhr

      let fullResponse = ''
      let lastIndex = 0

      xhr.open('POST', `${this.baseUrl}/v1/messages`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('x-api-key', this.apiKey)
      xhr.setRequestHeader('anthropic-version', API_CONFIG.ANTHROPIC_VERSION)

      xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length

        const lines = newData.split('\n')
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
                reject(new Error(event.error?.message || 'Stream error'))
                xhr.abort()
                return
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      xhr.onload = () => {
        this.activeXhr = null
        if (xhr.status >= 200 && xhr.status < 300) {
          if (fullResponse) {
            messages.push({ role: 'assistant', content: fullResponse })
          }
          onEvent({ type: 'lifecycle', phase: 'end' })
          resolve()
        } else {
          onEvent({ type: 'lifecycle', phase: 'end' })
          reject(new Error(`API error: ${xhr.status} - ${xhr.responseText}`))
        }
      }

      xhr.onerror = () => {
        this.activeXhr = null
        onEvent({ type: 'lifecycle', phase: 'end' })
        reject(new Error('Network error'))
      }

      xhr.onabort = () => {
        this.activeXhr = null
        onEvent({ type: 'lifecycle', phase: 'end' })
        resolve()
      }

      xhr.send(
        JSON.stringify({
          model: this.model,
          max_tokens: API_CONFIG.CLAUDE_MAX_TOKENS,
          messages: messages.map(this.formatMessageForApi),
          stream: true,
        }),
      )
    })
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
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
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
      return { status: 'degraded', message: `API returned status ${response.status}` }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { status: 'unhealthy', message }
    }
  }
}
