import { Platform } from 'react-native'

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

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Chat provider for Apple Foundation Models (on-device AI).
 *
 * Uses Apple's FoundationModels framework via a local Expo native module
 * to run language models entirely on-device using Apple Intelligence
 * and CoreML. Requires iOS 26+ on a device with Apple Intelligence support.
 *
 * Supports streaming responses via native event emitter.
 */
export class AppleChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    fileAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
    skills: false,
  }

  private connected = false
  private connectionListeners: Array<(connected: boolean, reconnecting: boolean) => void> = []
  private sessions: Map<string, ConversationMessage[]> = new Map()
  private nativeModule: typeof import('../../../modules/apple-intelligence') | null = null
  private activeCleanup: (() => void) | null = null

  constructor(_config: ProviderConfig) {
    // Config is accepted for interface compatibility but Apple Intelligence
    // doesn't need URL or token - it runs entirely on-device.
  }

  async connect(): Promise<void> {
    if (Platform.OS !== 'ios') {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error('Apple Intelligence is only available on iOS.')
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.nativeModule = require('../../../modules/apple-intelligence')
    } catch {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(
        'Apple Intelligence native module not found. Ensure the app is built with native module support.',
      )
    }

    const available = this.nativeModule!.isAvailable()
    if (!available) {
      this.connected = false
      this.notifyConnectionState(false, false)
      throw new Error(
        'Apple Intelligence is not available on this device. Requires iOS 26+ with Apple Intelligence support.',
      )
    }

    this.connected = true
    this.notifyConnectionState(true, false)
  }

  disconnect(): void {
    if (this.activeCleanup) {
      this.activeCleanup()
      this.activeCleanup = null
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

  private getSessionMessages(sessionKey: string): ConversationMessage[] {
    if (!this.sessions.has(sessionKey)) {
      this.sessions.set(sessionKey, [])
    }
    return this.sessions.get(sessionKey)!
  }

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    if (!this.nativeModule) {
      throw new Error('Apple Intelligence is not connected.')
    }

    const messages = this.getSessionMessages(params.sessionKey)

    messages.push({ role: 'user', content: params.message })

    onEvent({ type: 'lifecycle', phase: 'start' })

    const systemPrompt = params.systemMessage || 'You are a helpful assistant.'
    const messagesJson = JSON.stringify(messages)

    try {
      let fullResponse = ''

      await new Promise<void>((resolve, reject) => {
        const requestId = `apple-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        this.activeCleanup = this.nativeModule!.generateStreamingResponse(
          systemPrompt,
          messagesJson,
          requestId,
          (delta: string) => {
            // The native module sends the full accumulated text on each delta.
            // We need to extract just the new portion.
            const newContent = delta.slice(fullResponse.length)
            if (newContent) {
              fullResponse = delta
              onEvent({ type: 'delta', delta: newContent })
            }
          },
          () => {
            this.activeCleanup = null
            resolve()
          },
          (error: string) => {
            this.activeCleanup = null
            reject(new Error(error))
          },
        )
      })

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
    if (!this.nativeModule) {
      return { status: 'unhealthy' }
    }
    try {
      const available = this.nativeModule.isAvailable()
      return { status: available ? 'healthy' : 'unhealthy' }
    } catch {
      return { status: 'unhealthy' }
    }
  }
}
