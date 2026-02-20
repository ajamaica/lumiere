import { getMcpManager } from '../mcp'
import { MoltGatewayClient } from '../molt/client'
import { AgentEvent, ChatAttachmentPayload, ConnectionState } from '../molt/types'
import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  ProviderConfig,
  SendMessageParams,
} from './types'

const METADATA_MARKER = 'Conversation info (untrusted metadata):'

/**
 * Strip the "Conversation info (untrusted metadata)" block the gateway
 * prepends/appends to user messages so it never leaks into the UI or the
 * local cache. The block spans from the marker through a `[timestamp]` line.
 */
function stripMetadataFromText(text: string): string {
  const startIdx = text.indexOf(METADATA_MARKER)
  if (startIdx === -1) return text

  // Walk past the JSON `}` → opening `[` → closing `]` of the timestamp line
  const closingBrace = text.indexOf('}', startIdx)
  if (closingBrace === -1) return text.substring(0, startIdx).trimEnd()

  const openBracket = text.indexOf('[', closingBrace)
  if (openBracket === -1) return text.substring(0, startIdx).trimEnd()

  const closeBracket = text.indexOf(']', openBracket)
  if (closeBracket === -1) return text.substring(0, startIdx).trimEnd()

  const before = text.substring(0, startIdx)
  const after = text.substring(closeBracket + 1)
  return (before + after).trim()
}

function stripHistoryMessageMetadata(msg: ChatHistoryMessage): ChatHistoryMessage {
  return {
    ...msg,
    content: msg.content.map((block) => {
      if (block.type !== 'text' || !block.text) return block
      const cleaned = stripMetadataFromText(block.text)
      if (cleaned === block.text) return block
      return { ...block, text: cleaned }
    }),
  }
}

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
    canvas: true,
  }

  private client: MoltGatewayClient

  constructor(config: ProviderConfig) {
    this.client = new MoltGatewayClient({
      url: config.url,
      token: config.token,
      password: config.password,
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
   * Adapts the new ConnectionState-based listener to the
   * (connected, reconnecting, awaitingApproval) signature expected
   * by the ChatProvider interface.
   */
  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean, awaitingApproval?: boolean) => void,
  ): () => void {
    return this.client.onConnectionStateChange((state: ConnectionState) => {
      listener(state === 'connected', state === 'reconnecting', state === 'awaitingApproval')
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

    // Inject MCP tool manifest into the system message when MCP tools are
    // available. The manifest tells the agent about available MCP servers and
    // tools so it can call them directly via HTTP/web_fetch.
    const mcpManager = getMcpManager()
    const mcpManifest = mcpManager.generateToolManifest()
    let systemMessage = params.systemMessage ?? ''
    if (mcpManifest) {
      const mcpContext = `[Available MCP Tools]\n${mcpManifest}`
      systemMessage = systemMessage ? `${systemMessage}\n\n${mcpContext}` : mcpContext
    }

    // Prepend system message as context for Molt gateway
    const message = systemMessage
      ? `[System: ${systemMessage}]\n\n${params.message}`
      : params.message

    // Subscribe to agent events for streaming before sending.
    // Filter by sessionKey so that events from other sessions are ignored.
    const unsubscribe = this.client.onAgentEvent((event: AgentEvent) => {
      if (event.sessionKey !== params.sessionKey) return

      if (event.stream === 'assistant' && event.data.delta) {
        onEvent({ type: 'delta', delta: event.data.delta })
      } else if (event.stream === 'lifecycle') {
        onEvent({ type: 'lifecycle', phase: event.data.phase })
        if (event.data.phase === 'end') {
          unsubscribe()
        }
      } else if (event.stream === 'tool' || event.stream === 'subagent') {
        if (event.data.toolName) {
          onEvent({
            type: 'tool_event',
            toolName: event.data.toolName,
            toolCallId: event.data.toolCallId,
            toolInput: event.data.toolInput,
            toolStatus: event.data.toolStatus,
          })
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
    const messages = response?.messages ?? []
    return { messages: messages.map(stripHistoryMessageMetadata) }
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
