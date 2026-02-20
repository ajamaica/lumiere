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
    // available. The manifest instructs the agent to embed <mcp_call> tags
    // in its response text. The client parses those tags after the run
    // finishes, executes the calls, and sends results as follow-up messages.
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

    // Accumulate the full assistant response so we can scan for <mcp_call>
    // tags once the run ends.
    let accumulatedText = ''
    const hasMcpTools = mcpManager.getAllTools().length > 0

    // Subscribe to agent events for streaming before sending.
    // Filter by sessionKey so that events from other sessions are ignored.
    const unsubscribe = this.client.onAgentEvent((event: AgentEvent) => {
      if (event.sessionKey !== params.sessionKey) return

      if (event.stream === 'assistant' && event.data.delta) {
        if (hasMcpTools) {
          accumulatedText += event.data.delta
        }
        onEvent({ type: 'delta', delta: event.data.delta })
      } else if (event.stream === 'lifecycle') {
        onEvent({ type: 'lifecycle', phase: event.data.phase })
        if (event.data.phase === 'end') {
          unsubscribe()
          // Parse accumulated text for <mcp_call> tags and execute them
          if (hasMcpTools && accumulatedText) {
            this.processMcpCalls(accumulatedText, params.sessionKey, onEvent)
          }
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

  /**
   * Parse `<mcp_call>` tags from the agent's response text, execute each
   * tool call client-side via the MCP manager, and send results back to the
   * gateway as follow-up user messages.
   */
  private async processMcpCalls(
    responseText: string,
    sessionKey: string,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const calls = parseMcpCalls(responseText)
    if (calls.length === 0) return

    const mcpManager = getMcpManager()
    let callIndex = 0

    for (const call of calls) {
      callIndex++
      const callId = `mcp-${Date.now()}-${callIndex}`

      try {
        // Emit running event so the UI shows progress
        onEvent({
          type: 'tool_event',
          toolName: call.tool,
          toolCallId: callId,
          toolInput: call.args,
          toolStatus: 'running',
        })

        const result: McpToolResult = await mcpManager.callTool(call.tool, call.args)
        const resultText = formatMcpResult(result)

        // Emit completion event
        onEvent({
          type: 'tool_event',
          toolName: call.tool,
          toolCallId: callId,
          toolInput: call.args,
          toolStatus: result.isError ? 'error' : 'completed',
        })

        // Send the result back as a follow-up user message
        await this.client.chatSend(sessionKey, `[MCP Result — ${call.tool}]\n${resultText}`)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)

        onEvent({
          type: 'tool_event',
          toolName: call.tool,
          toolCallId: callId,
          toolInput: call.args,
          toolStatus: 'error',
        })

        // Report error back so the agent can react
        await this.client
          .chatSend(sessionKey, `[MCP Error — ${call.tool}]: ${errorMsg}`)
          .catch(() => {
            // Ignore send errors for error reporting
          })
      }
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

// ─── MCP Helpers ──────────────────────────────────────────────────────────────

interface McpCallDescriptor {
  tool: string
  args: Record<string, unknown>
}

/**
 * Extract `<mcp_call tool="...">{ json }</mcp_call>` blocks from the agent's
 * response text. Tolerant of whitespace and minor formatting variations.
 */
function parseMcpCalls(text: string): McpCallDescriptor[] {
  const TAG_RE = /<mcp_call\s+tool="([^"]+)">\s*([\s\S]*?)\s*<\/mcp_call>/g
  const results: McpCallDescriptor[] = []
  let match: RegExpExecArray | null

  while ((match = TAG_RE.exec(text)) !== null) {
    const tool = match[1]
    const body = match[2].trim()
    let args: Record<string, unknown> = {}
    if (body) {
      try {
        args = JSON.parse(body) as Record<string, unknown>
      } catch {
        // If the agent produced malformed JSON, pass the raw body as a single
        // `input` parameter so the call can still be attempted.
        args = { input: body }
      }
    }
    results.push({ tool, args })
  }

  return results
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
