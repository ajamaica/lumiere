import type { McpToolResult } from '../mcp'
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
    // available. This makes the Molt agent aware of external MCP tools.
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

    // Track pending MCP tool calls for client-side execution
    const pendingMcpCalls = new Map<string, { toolName: string; input: Record<string, unknown> }>()

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
          // Execute any pending MCP tool calls after the agent run completes
          this.executePendingMcpCalls(pendingMcpCalls, params.sessionKey, onEvent)
        }
      } else if (event.stream === 'tool' || event.stream === 'subagent') {
        if (event.data.toolName) {
          const toolName = event.data.toolName
          const toolCallId = event.data.toolCallId ?? ''

          // Check if this is an MCP tool call starting
          if (mcpManager.isMcpTool(toolName) && event.data.toolStatus === 'running' && toolCallId) {
            pendingMcpCalls.set(toolCallId, {
              toolName,
              input: event.data.toolInput ?? {},
            })
          }

          onEvent({
            type: 'tool_event',
            toolName,
            toolCallId,
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

  /**
   * Execute pending MCP tool calls client-side and send results back
   * to the Molt gateway as follow-up messages.
   */
  private async executePendingMcpCalls(
    pendingCalls: Map<string, { toolName: string; input: Record<string, unknown> }>,
    sessionKey: string,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    if (pendingCalls.size === 0) return

    const mcpManager = getMcpManager()

    for (const [toolCallId, { toolName, input }] of pendingCalls) {
      try {
        // Emit a running event for the client-side execution
        onEvent({
          type: 'tool_event',
          toolName: `${toolName} (executing)`,
          toolCallId: `${toolCallId}-exec`,
          toolInput: input,
          toolStatus: 'running',
        })

        const result: McpToolResult = await mcpManager.callTool(toolName, input)

        // Format the result as text
        const resultText = formatMcpResult(result)

        // Emit completion event
        onEvent({
          type: 'tool_event',
          toolName: `${toolName} (executing)`,
          toolCallId: `${toolCallId}-exec`,
          toolInput: input,
          toolStatus: result.isError ? 'error' : 'completed',
        })

        // Send the MCP tool result back as a follow-up message
        await this.client.chatSend(
          sessionKey,
          `[MCP Tool Result for ${toolName} (call ${toolCallId})]:\n${resultText}`,
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)

        onEvent({
          type: 'tool_event',
          toolName: `${toolName} (executing)`,
          toolCallId: `${toolCallId}-exec`,
          toolInput: input,
          toolStatus: 'error',
        })

        // Send error result back so the agent knows the tool failed
        await this.client
          .chatSend(
            sessionKey,
            `[MCP Tool Error for ${toolName} (call ${toolCallId})]: ${errorMsg}`,
          )
          .catch(() => {
            // Ignore send errors for error reporting
          })
      }
    }

    pendingCalls.clear()
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

/** Format an MCP tool result into a human-readable string for the agent. */
function formatMcpResult(result: McpToolResult): string {
  return result.content
    .map((item) => {
      if (item.type === 'text' && item.text) return item.text
      if (item.type === 'image') return '[image data]'
      if (item.type === 'resource') return item.text ?? '[resource]'
      return ''
    })
    .filter(Boolean)
    .join('\n')
}
