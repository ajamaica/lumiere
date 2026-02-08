import { agentConfig } from '../../config/gateway.config'
import { MoltGatewayClient } from '../molt/client'
import { AgentEvent } from '../molt/types'
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
  private connected = false

  constructor(config: ProviderConfig) {
    this.client = new MoltGatewayClient({
      url: config.url,
      token: config.token,
      clientId: config.clientId,
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
    this.connected = true
  }

  disconnect(): void {
    this.client.disconnect()
    this.connected = false
  }

  isConnected(): boolean {
    return this.client.isConnected()
  }

  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean) => void,
  ): () => void {
    return this.client.onConnectionStateChange(listener)
  }

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const agentParams = {
      message: params.message,
      idempotencyKey: `msg-${Date.now()}-${Math.random()}`,
      agentId: agentConfig.defaultAgentId,
      sessionKey: params.sessionKey,
      attachments: params.attachments?.map((a) => ({
        type: a.type,
        content: a.data,
        mimeType: a.mimeType,
        fileName: a.name,
      })),
    }

    await this.client.sendAgentRequest(agentParams, (event: AgentEvent) => {
      if (event.stream === 'assistant' && event.data.delta) {
        onEvent({ type: 'delta', delta: event.data.delta })
      } else if (event.stream === 'lifecycle') {
        onEvent({ type: 'lifecycle', phase: event.data.phase })
      }
    })
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
