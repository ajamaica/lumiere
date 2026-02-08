import { DEFAULT_MODELS } from '../../constants'
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

interface EmergentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | EmergentContentPart[]
}

type EmergentContentPart = EmergentTextPart | EmergentImagePart

interface EmergentTextPart {
  type: 'text'
  text: string
}

interface EmergentImagePart {
  type: 'image_url'
  image_url: {
    url: string
  }
}

interface EmergentStreamChunk {
  id: string
  choices: Array<{
    delta: {
      content?: string
      role?: string
    }
    finish_reason: string | null
  }>
  error?: {
    message: string
  }
}

/**
 * Chat provider for the Emergent (emergent.sh) API.
 *
 * Uses an OpenAI-compatible /v1/chat/completions endpoint with
 * streaming support for real-time response delivery.
 */
export class EmergentChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: true,
    fileAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
    skills: false,
  }

  private baseUrl: string
  private apiKey: string
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private abortController: AbortController | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, EmergentMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.EMERGENT
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok && response.status !== 401) {
        throw new Error(`API returned status ${response.status}`)
      }

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Cannot connect to Emergent API. Check your API key and endpoint.')
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

  private getSessionMessages(sessionKey: string): EmergentMessage[] {
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
    const contentParts: EmergentContentPart[] = []

    if (params.message) {
      contentParts.push({ type: 'text', text: params.message })
    }

    // Add image attachments if present
    if (params.attachments?.length) {
      for (const attachment of params.attachments) {
        if (attachment.type === 'image' && attachment.data) {
          const mimeType = attachment.mimeType || 'image/png'
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${attachment.data}`,
            },
          })
        }
      }
    }

    const userMsg: EmergentMessage = {
      role: 'user',
      content:
        contentParts.length === 1 && contentParts[0].type === 'text'
          ? contentParts[0].text
          : contentParts,
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
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
              const chunk: EmergentStreamChunk = JSON.parse(data)

              if (chunk.error) {
                throw new Error(chunk.error.message || 'Stream error')
              }

              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                fullResponse += delta
                onEvent({ type: 'delta', delta })
              }
            } catch (e) {
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

  private formatMessageForApi(msg: EmergentMessage): { role: string; content: unknown } {
    return {
      role: msg.role,
      content: msg.content,
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced
      .filter(
        (m): m is EmergentMessage & { role: 'user' | 'assistant' } =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m, i) => ({
        role: m.role,
        content: [{ type: 'text', text: this.extractTextContent(m.content) }],
        timestamp: Date.now() - (sliced.length - i) * 1000,
      }))

    return { messages: historyMessages }
  }

  private extractTextContent(content: string | EmergentContentPart[]): string {
    if (typeof content === 'string') {
      return content
    }
    const textParts = content.filter((p): p is EmergentTextPart => p.type === 'text' && !!p.text)
    return textParts.map((p) => p.text).join('\n')
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
          Authorization: `Bearer ${this.apiKey}`,
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
