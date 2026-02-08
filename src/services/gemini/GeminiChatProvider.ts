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

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
      role?: string
    }
    finishReason?: string
  }>
  error?: {
    code: number
    message: string
    status: string
  }
}

/**
 * Chat provider for the Google Gemini API.
 *
 * Uses the Gemini generateContent endpoint with streaming support
 * for real-time response delivery via server-sent events.
 */
export class GeminiChatProvider implements ChatProvider {
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
  private sessions: Map<string, GeminiContent[]> = new Map()

  constructor(config: ProviderConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '')
    this.apiKey = config.token
    this.model = config.model || DEFAULT_MODELS.GEMINI
  }

  async connect(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
      })

      if (!response.ok && response.status !== 401) {
        throw new Error(`API returned status ${response.status}`)
      }

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Cannot connect to Gemini API. Check your API key and endpoint.')
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

  private getSessionMessages(sessionKey: string): GeminiContent[] {
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

    // Build the user message parts
    const parts: GeminiPart[] = []

    if (params.message) {
      parts.push({ text: params.message })
    }

    // Add image attachments if present
    if (params.attachments?.length) {
      for (const attachment of params.attachments) {
        if (attachment.type === 'image' && attachment.data) {
          parts.push({
            inline_data: {
              mime_type: attachment.mimeType || 'image/png',
              data: attachment.data,
            },
          })
        }
      }
    }

    const userMsg: GeminiContent = {
      role: 'user',
      parts,
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    const streamUrl = `${this.baseUrl}/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`

    // Use XMLHttpRequest for streaming — React Native's fetch does not
    // support response.body ReadableStream, so XHR with onprogress is
    // the reliable way to receive incremental SSE data.
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      this.activeXhr = xhr

      let fullResponse = ''
      let lastIndex = 0

      xhr.open('POST', streamUrl)
      xhr.setRequestHeader('Content-Type', 'application/json')

      xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length

        const lines = newData.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const chunk: GeminiStreamChunk = JSON.parse(data)

              if (chunk.error) {
                reject(new Error(chunk.error.message || 'Stream error'))
                xhr.abort()
                return
              }

              const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                fullResponse += text
                onEvent({ type: 'delta', delta: text })
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
            messages.push({ role: 'model', parts: [{ text: fullResponse }] })
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
          contents: messages,
          generationConfig: {
            maxOutputTokens: API_CONFIG.GEMINI_MAX_TOKENS,
          },
        }),
      )
    })
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced.map((m, i) => ({
      role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: [{ type: 'text', text: this.extractTextContent(m.parts) }],
      timestamp: Date.now() - (sliced.length - i) * 1000,
    }))

    return { messages: historyMessages }
  }

  private extractTextContent(parts: GeminiPart[]): string {
    return parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('\n')
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
      const response = await fetch(`${this.baseUrl}/v1beta/models?key=${this.apiKey}`, {
        method: 'GET',
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
