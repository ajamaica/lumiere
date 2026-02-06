import { OpenRouter } from '@openrouter/sdk'
import type { AssistantMessage, Message, UserMessage } from '@openrouter/sdk/models'

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

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | OpenRouterContentPart[]
}

type OpenRouterContentPart = OpenRouterTextPart | OpenRouterImagePart

interface OpenRouterTextPart {
  type: 'text'
  text: string
}

interface OpenRouterImagePart {
  type: 'image_url'
  image_url: {
    url: string
  }
}

/**
 * Chat provider for the OpenRouter API.
 *
 * OpenRouter provides a unified API for accessing many AI models
 * (OpenAI, Anthropic, Google, Meta, etc.) through the OpenRouter SDK.
 */
export class OpenRouterChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: true,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private client: OpenRouter
  private model: string
  private serverURL: string
  private apiKey: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private abortController: AbortController | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, OpenRouterMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    // Extract base URL without trailing slashes and without /api/v1 path
    const baseUrl = config.url.replace(/\/+$/, '').replace(/\/api\/v1$/, '')

    this.serverURL = `${baseUrl}/api/v1`
    this.apiKey = config.token

    this.client = new OpenRouter({
      apiKey: this.apiKey,
      serverURL: this.serverURL,
      httpReferer: 'https://github.com/lumiere-app',
      xTitle: 'Lumiere',
    })
    this.model = config.model || DEFAULT_MODELS.OPENROUTER
  }

  async connect(): Promise<void> {
    try {
      // Test connection by fetching models list
      await this.client.models.list()

      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Cannot connect to OpenRouter API. Check your API key and endpoint.')
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

  private getSessionMessages(sessionKey: string): OpenRouterMessage[] {
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
    const contentParts: OpenRouterContentPart[] = []

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

    const userMsg: OpenRouterMessage = {
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
      // Convert our messages to SDK format
      const sdkMessages: Message[] = messages.map(this.convertToSDKMessage)

      // Use fetch directly instead of SDK to avoid validation issues with streaming responses
      const response = await fetch(`${this.serverURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/lumiere-app',
          'X-Title': 'Lumiere',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: API_CONFIG.OPENROUTER_MAX_TOKENS,
          messages: sdkMessages,
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
              const chunk = JSON.parse(data)

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

  private convertToSDKMessage(msg: OpenRouterMessage): Message {
    if (msg.role === 'user') {
      const userMessage: UserMessage = {
        role: 'user',
        content:
          typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((part) => {
                if (part.type === 'text') {
                  return {
                    type: 'text',
                    text: part.text,
                  }
                } else {
                  return {
                    type: 'image_url',
                    imageUrl: {
                      url: part.image_url.url,
                    },
                  }
                }
              }),
      }
      return userMessage
    } else {
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : null,
      }
      return assistantMessage
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced
      .filter(
        (m): m is OpenRouterMessage & { role: 'user' | 'assistant' } =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m, i) => ({
        role: m.role,
        content: [{ type: 'text', text: this.extractTextContent(m.content) }],
        timestamp: Date.now() - (sliced.length - i) * 1000,
      }))

    return { messages: historyMessages }
  }

  private extractTextContent(content: string | OpenRouterContentPart[]): string {
    if (typeof content === 'string') {
      return content
    }
    const textParts = content.filter((p): p is OpenRouterTextPart => p.type === 'text' && !!p.text)
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
      await this.client.models.list()
      return { status: 'healthy' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
