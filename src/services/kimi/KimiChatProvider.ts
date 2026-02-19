import { API_CONFIG, DEFAULT_MODELS, HTTP_CONFIG } from '../../constants'
import { fetchWithRetry } from '../../utils/httpRetry'
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

interface KimiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | KimiContentPart[]
}

type KimiContentPart = KimiTextPart | KimiImagePart

interface KimiTextPart {
  type: 'text'
  text: string
}

interface KimiImagePart {
  type: 'image_url'
  image_url: {
    url: string
  }
}

interface KimiStreamChunk {
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
 * Chat provider for the Kimi (Moonshot AI) Chat Completions API.
 *
 * Uses the /v1/chat/completions endpoint with streaming support
 * for real-time response delivery. Kimi uses an OpenAI-compatible
 * API format (https://api.moonshot.cn).
 */
export class KimiChatProvider implements ChatProvider {
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
  private activeXhr: XMLHttpRequest | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, KimiMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.KIMI
  }

  async connect(): Promise<void> {
    try {
      const response = await fetchWithRetry(
        `${this.baseUrl}/v1/models`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        { timeoutMs: HTTP_CONFIG.CONNECT_TIMEOUT_MS },
      )

      if (!response.ok && response.status !== 401) {
        throw new Error(`API returned status ${response.status}`)
      }

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Cannot connect to Kimi API. Check your API key and endpoint.')
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

  private getSessionMessages(sessionKey: string): KimiMessage[] {
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
    const contentParts: KimiContentPart[] = []

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

    const userMsg: KimiMessage = {
      role: 'user',
      content:
        contentParts.length === 1 && contentParts[0].type === 'text'
          ? contentParts[0].text
          : contentParts,
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    // Use XMLHttpRequest for streaming — React Native's fetch does not
    // support response.body ReadableStream, so XHR with onprogress is
    // the reliable way to receive incremental SSE data.
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      this.activeXhr = xhr
      xhr.timeout = HTTP_CONFIG.STREAM_TIMEOUT_MS

      let fullResponse = ''
      let lastIndex = 0

      xhr.open('POST', `${this.baseUrl}/v1/chat/completions`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`)

      xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length

        const lines = newData.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const chunk: KimiStreamChunk = JSON.parse(data)

              if (chunk.error) {
                reject(new Error(chunk.error.message || 'Stream error'))
                xhr.abort()
                return
              }

              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                fullResponse += delta
                onEvent({ type: 'delta', delta })
              }
            } catch {
              // Ignore JSON parse errors from partial chunks
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

      xhr.ontimeout = () => {
        this.activeXhr = null
        onEvent({ type: 'lifecycle', phase: 'end' })
        reject(new Error('Request timed out'))
      }

      // Build API messages, prepending system message if provided
      const apiMessages = messages.map(this.formatMessageForApi)
      if (params.systemMessage) {
        apiMessages.unshift({ role: 'system', content: params.systemMessage })
      }

      xhr.send(
        JSON.stringify({
          model: this.model,
          max_tokens: API_CONFIG.KIMI_MAX_TOKENS,
          messages: apiMessages,
          stream: true,
        }),
      )
    })
  }

  private formatMessageForApi(msg: KimiMessage): { role: string; content: unknown } {
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
        (m): m is KimiMessage & { role: 'user' | 'assistant' } =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m, i) => ({
        role: m.role,
        content: [{ type: 'text', text: this.extractTextContent(m.content) }],
        timestamp: Date.now() - (sliced.length - i) * 1000,
      }))

    return { messages: historyMessages }
  }

  private extractTextContent(content: string | KimiContentPart[]): string {
    if (typeof content === 'string') {
      return content
    }
    const textParts = content.filter((p): p is KimiTextPart => p.type === 'text' && !!p.text)
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
      const response = await fetchWithRetry(
        `${this.baseUrl}/v1/models`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        { timeoutMs: HTTP_CONFIG.CONNECT_TIMEOUT_MS },
      )

      if (response.ok) {
        return { status: 'healthy' }
      }
      return { status: 'degraded' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
