import { agentConfig } from '../../config/gateway.config'
import { generateIdempotencyKey, MoltGatewayClient } from '../molt/client'
import { AgentEvent, ConnectionState } from '../molt/types'
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
    // Extract agentId from session key format: agent:<agentId>:<sessionName>
    const sessionParts = params.sessionKey.split(':')
    const agentId = sessionParts.length >= 2 ? sessionParts[1] : agentConfig.defaultAgentId

    const agentParams = {
      message: params.message,
      idempotencyKey: generateIdempotencyKey(),
      agentId,
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
