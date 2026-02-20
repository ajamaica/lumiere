/**
 * McpClient — lightweight MCP client compatible with React Native.
 *
 * Communicates with MCP servers over Streamable HTTP (POST for requests,
 * SSE for streaming). Does not depend on Node.js-specific APIs.
 */

import { logger } from '../../utils/logger'
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpInitializeResult,
  McpServerConfig,
  McpTool,
  McpToolInputSchema,
  McpToolResult,
  McpToolResultContent,
} from './types'

const mcpLogger = logger.create('MCP')

const MCP_PROTOCOL_VERSION = '2025-03-26'

export class McpClient {
  private config: McpServerConfig
  private requestId = 0
  private sessionId: string | null = null
  private serverCapabilities: McpInitializeResult | null = null

  constructor(config: McpServerConfig) {
    this.config = config
  }

  /** The MCP server endpoint URL. */
  get url(): string {
    return this.config.url
  }

  /** Whether the client has been initialized. */
  get isInitialized(): boolean {
    return this.serverCapabilities !== null
  }

  /** Server info from the initialize response. */
  get serverInfo(): McpInitializeResult | null {
    return this.serverCapabilities
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Initialize the MCP session. Must be called before any other method.
   * Sends `initialize` followed by `notifications/initialized`.
   */
  async initialize(): Promise<McpInitializeResult> {
    const result = await this.sendRequest<McpInitializeResult>('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'lumiere',
        version: '1.2.0',
      },
    })

    this.serverCapabilities = result

    // Send initialized notification (no response expected)
    await this.sendNotification('notifications/initialized')

    mcpLogger.info(`MCP initialized: ${result.serverInfo.name} v${result.serverInfo.version}`)
    return result
  }

  /**
   * Close the MCP session gracefully.
   */
  async close(): Promise<void> {
    this.serverCapabilities = null
    this.sessionId = null
    this.requestId = 0
  }

  // ─── Tool Operations ────────────────────────────────────────────────────────

  /**
   * List all tools available on the MCP server.
   */
  async listTools(): Promise<McpTool[]> {
    const result = await this.sendRequest<{ tools: McpTool[] }>('tools/list', {})
    return (result.tools ?? []).map(normalizeTool)
  }

  /**
   * Call a tool on the MCP server.
   */
  async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    const result = await this.sendRequest<McpToolResult>('tools/call', {
      name: toolName,
      arguments: args,
    })
    return {
      content: (result.content ?? []) as McpToolResultContent[],
      isError: result.isError ?? false,
    }
  }

  // ─── Transport ──────────────────────────────────────────────────────────────

  /**
   * Send a JSON-RPC request and wait for the response.
   */
  private async sendRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = ++this.requestId
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    mcpLogger.info(`MCP request: ${method}`, { id })

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    // Capture session ID from response headers
    const newSessionId = response.headers.get('mcp-session-id')
    if (newSessionId) {
      this.sessionId = newSessionId
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new McpError(
        `MCP request ${method} failed: ${response.status} ${response.statusText}`,
        errorText,
      )
    }

    const contentType = response.headers.get('content-type') ?? ''

    // Handle SSE response (streaming)
    if (contentType.includes('text/event-stream')) {
      return this.parseSSEResponse<T>(response, id)
    }

    // Handle standard JSON response
    const json = (await response.json()) as JsonRpcResponse
    if (json.error) {
      throw new McpError(`MCP error: ${json.error.message}`, json.error.data, json.error.code)
    }

    return json.result as T
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  private async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    const body = {
      jsonrpc: '2.0' as const,
      method,
      params: params ?? {},
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    // Accept any 2xx as success for notifications
    if (!response.ok && response.status !== 202 && response.status !== 204) {
      mcpLogger.error(`MCP notification ${method} failed: ${response.status}`)
    }
  }

  /**
   * Parse an SSE response stream to extract the JSON-RPC response.
   */
  private async parseSSEResponse<T>(response: Response, expectedId: number | string): Promise<T> {
    const text = await response.text()
    const lines = text.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue

      try {
        const json = JSON.parse(data) as JsonRpcResponse
        if (json.id === expectedId) {
          if (json.error) {
            throw new McpError(`MCP error: ${json.error.message}`, json.error.data, json.error.code)
          }
          return json.result as T
        }
      } catch (e) {
        if (e instanceof McpError) throw e
        // Skip non-JSON lines
      }
    }

    throw new McpError('No matching response found in SSE stream')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure tool has a valid inputSchema. */
function normalizeTool(tool: McpTool): McpTool {
  const inputSchema: McpToolInputSchema = tool.inputSchema ?? {
    type: 'object' as const,
    properties: {},
  }
  return { ...tool, inputSchema }
}

/** Error class for MCP failures. */
export class McpError extends Error {
  public readonly data?: unknown
  public readonly code?: number

  constructor(message: string, data?: unknown, code?: number) {
    super(message)
    this.name = 'McpError'
    this.data = data
    this.code = code
  }
}
