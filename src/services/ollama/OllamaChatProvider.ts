import { Ollama } from 'ollama/browser'

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

/**
 * Chat provider for Ollama using the official ollama-js client.
 *
 * Uses the `ollama` npm package for robust HTTP communication,
 * streaming, and error handling against a local or remote Ollama server.
 */
export class OllamaChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    fileAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private client: Ollama
  private model: string
  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private abortController: AbortController | null = null

  // In-memory conversation history keyed by session
  private sessions: Map<string, OllamaMessage[]> = new Map()

  constructor(config: ProviderConfig) {
    const host = config.url.replace(/\/+$/, '')
    this.client = new Ollama({ host })
    this.model = config.model || 'llama3.2'
  }

  async connect(): Promise<void> {
    try {
      await this.client.list()
      this.connected = true
      this.notifyConnectionState(true, false)
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(`Cannot connect to Ollama. Make sure Ollama is running (ollama serve).`)
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

    const userMsg: OllamaMessage = {
      role: 'user',
      content: params.message,
    }

    if (params.attachments?.length) {
      userMsg.images = params.attachments
        .filter((a) => a.type === 'image' && a.data)
        .map((a) => a.data!)
    }

    messages.push(userMsg)

    onEvent({ type: 'lifecycle', phase: 'start' })

    this.abortController = new AbortController()

    try {
      const response = await this.client.chat({
        model: this.model,
        messages,
        stream: false,
      })

      const fullResponse = response.message?.content || ''

      if (fullResponse) {
        onEvent({ type: 'delta', delta: fullResponse })
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

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        role: m.role as 'user' | 'assistant',
        content: [{ type: 'text', text: m.content }],
        timestamp: Date.now() - (sliced.length - i) * 1000,
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
      await this.client.list()
      return { status: 'healthy' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
