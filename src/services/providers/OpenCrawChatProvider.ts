import { getMcpManager } from '../mcp'
import { generateIdempotencyKey, OpenCrawGatewayClient } from '../opencraw/client'
import { AgentEvent, Attachment, ConnectionState } from '../opencraw/types'
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

/**
 * Strip the `[System: …]` prefix from messages in existing chat history.
 * The old sendMessage implementation prepended system messages as a text
 * prefix; we now use `extraSystemPrompt` via the `agent` RPC instead, but
 * older history entries may still contain the prefix.
 */
function stripSystemMessagePrefix(text: string): string {
  if (!text.startsWith('[System: ')) return text
  const closingBracket = text.indexOf(']\n\n')
  if (closingBracket === -1) return text
  return text.substring(closingBracket + 3)
}

function stripHistoryMessageMetadata(msg: ChatHistoryMessage): ChatHistoryMessage {
  return {
    ...msg,
    content: msg.content.map((block) => {
      if (block.type !== 'text' || !block.text) return block
      let cleaned = stripMetadataFromText(block.text)
      cleaned = stripSystemMessagePrefix(cleaned)
      if (cleaned === block.text) return block
      return { ...block, text: cleaned }
    }),
  }
}

/**
 * Adapter that wraps OpenCrawGatewayClient to conform to the ChatProvider interface.
 * This preserves all existing OpenCraw Gateway functionality while allowing the
 * UI layer to work with any provider.
 */
export class OpenCrawChatProvider implements ChatProvider {
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

  private client: OpenCrawGatewayClient

  constructor(config: ProviderConfig) {
    this.client = new OpenCrawGatewayClient({
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
    // Convert provider attachments to the Attachment format used by the agent RPC
    let attachments: Attachment[] | undefined
    if (params.attachments?.length) {
      attachments = params.attachments
        .filter((a) => a.data) // only include attachments with actual content
        .map((a) => ({
          type: a.type as Attachment['type'],
          mimeType: a.mimeType || 'application/octet-stream',
          fileName: a.name || 'attachment',
          data: a.data!,
        }))
      if (attachments.length === 0) attachments = undefined
    }

    // Build the extraSystemPrompt from the session system message and MCP tools.
    // This uses the gateway's native `extraSystemPrompt` parameter on the `agent`
    // RPC method, which injects context directly into the server-side system prompt
    // instead of the old approach of embedding it as a [System: …] prefix in the
    // user message text.
    const mcpManager = getMcpManager()
    const mcpManifest = mcpManager.generateToolManifest()
    let extraSystemPrompt = params.systemMessage ?? ''
    if (mcpManifest) {
      const mcpContext = `[Available MCP Tools]\n${mcpManifest}`
      extraSystemPrompt = extraSystemPrompt ? `${extraSystemPrompt}\n\n${mcpContext}` : mcpContext
    }

    const eventHandler = (event: AgentEvent) => {
      if (event.sessionKey !== params.sessionKey) return

      if (event.stream === 'assistant' && event.data.delta) {
        onEvent({ type: 'delta', delta: event.data.delta })
      } else if (event.stream === 'lifecycle') {
        onEvent({ type: 'lifecycle', phase: event.data.phase })
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
    }

    await this.client.sendAgentRequest(
      {
        message: params.message,
        sessionKey: params.sessionKey,
        attachments,
        extraSystemPrompt: extraSystemPrompt || undefined,
        idempotencyKey: generateIdempotencyKey(),
      },
      eventHandler,
    )
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

  /** Expose the underlying client for OpenCraw-specific features (cron, scheduler, etc.) */
  getOpenCrawClient(): OpenCrawGatewayClient {
    return this.client
  }
}
