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

/**
 * Echo chat provider that simply echoes back whatever message the user sends.
 *
 * Useful for testing and debugging the chat UI without requiring
 * any external server or API.
 */
export class EchoChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
  }

  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []

  // In-memory conversation history keyed by session
  private sessions: Map<string, { role: 'user' | 'assistant'; content: string }[]> = new Map()

  constructor(_config: ProviderConfig) {
    // Echo provider doesn't need any config
  }

  async connect(): Promise<void> {
    this.connected = true
    this.notifyConnectionState(true, false)
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

  private getSessionMessages(
    sessionKey: string,
  ): { role: 'user' | 'assistant'; content: string }[] {
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

    messages.push({ role: 'user', content: params.message })

    onEvent({ type: 'lifecycle', phase: 'start' })

    // Simulate network delay before echoing back
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Echo back the same message
    const echoResponse = params.message

    onEvent({ type: 'delta', delta: echoResponse })

    messages.push({ role: 'assistant', content: echoResponse })

    onEvent({ type: 'lifecycle', phase: 'end' })
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const messages = this.getSessionMessages(sessionKey)
    const sliced = limit ? messages.slice(-limit) : messages

    const historyMessages: ChatHistoryMessage[] = sliced.map((m, i) => ({
      role: m.role,
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
    return { status: 'healthy' }
  }
}
