import { MoltGatewayClient } from '../molt/client'
import { AgentEvent, ChatAttachmentPayload, ConnectionState } from '../molt/types'
import {
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  ProviderConfig,
  SendMessageParams,
} from './types'

/**
 * Adapter that wraps MoltGatewayClient to conform to the ChatProvider interface.
 * This preserves all existing Molt Gateway functionality while allowing the
 * UI layer to work with any provider.
 */
export class MoltChatProvider implements ChatProvider {
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: true,
    fileAttachments: true,
    serverSessions: true,
    persistentHistory: true,
    scheduler: true,
    gatewaySnapshot: true,
    skills: true,
  }

  private client: MoltGatewayClient

  constructor(config: ProviderConfig) {
    this.client = new MoltGatewayClient({
      url: config.url,
      token: config.token,
      clientId: config.clientId,
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
  }

  disconnect(): void {
    this.client.disconnect()
  }

  isConnected(): boolean {
    return this.client.isConnected
  }

  /**
   * Adapts the new ConnectionState-based listener to the legacy
   * (connected: boolean, reconnecting: boolean) signature expected
   * by the ChatProvider interface.
   */
  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean) => void,
  ): () => void {
    return this.client.onConnectionStateChange((state: ConnectionState) => {
      listener(state === 'connected', state === 'reconnecting')
    })
  }

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    // Convert provider attachments to the wire-format ChatAttachmentPayload
    let attachments: ChatAttachmentPayload[] | undefined
    if (params.attachments?.length) {
      attachments = params.attachments
        .filter((a) => a.data) // only include attachments with actual content
        .map((a) => ({
          type: a.type,
          mimeType: a.mimeType || 'application/octet-stream',
          fileName: a.name || 'attachment',
          content: a.data!,
        }))
      if (attachments.length === 0) attachments = undefined
    }

    // Prepend system message as context for Molt gateway
    const message = params.systemMessage
      ? `[System: ${params.systemMessage}]\n\n${params.message}`
      : params.message

    // Subscribe to agent events for streaming before sending
    const unsubscribe = this.client.onAgentEvent((event: AgentEvent) => {
      if (event.stream === 'assistant' && event.data.delta) {
        onEvent({ type: 'delta', delta: event.data.delta })
      } else if (event.stream === 'lifecycle') {
        onEvent({ type: 'lifecycle', phase: event.data.phase })
        if (event.data.phase === 'end') {
          unsubscribe()
        }
      }
    })

    try {
      await this.client.chatSend(params.sessionKey, message, {
        attachments,
      })
    } catch (err) {
      unsubscribe()
      throw err
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const result = await this.client.getChatHistory(sessionKey, limit)
    const response = result as ChatHistoryResponse | undefined
    return { messages: response?.messages ?? [] }
  }

  async resetSession(sessionKey: string): Promise<void> {
    await this.client.resetSession(sessionKey)
  }

  async listSessions(): Promise<unknown> {
    return await this.client.listSessions()
  }

  async getHealth(): Promise<HealthStatus> {
    return await this.client.getHealth()
  }

  /** Expose the underlying client for Molt-specific features (cron, scheduler, etc.) */
  getMoltClient(): MoltGatewayClient {
    return this.client
  }
}
