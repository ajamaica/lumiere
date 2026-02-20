/**
 * McpManager — manages connections to multiple MCP servers.
 *
 * Provides a unified interface for discovering tools across all connected
 * MCP servers and executing tool calls against the correct server.
 */

import { logger } from '../../utils/logger'
import { McpClient, McpError } from './McpClient'
import type {
  McpConnectionState,
  McpServerConfig,
  McpServerState,
  McpTool,
  McpToolResult,
} from './types'

const mcpLogger = logger.create('McpManager')

/** Tool with server origin info for routing calls. */
export interface McpRegisteredTool extends McpTool {
  /** ID of the MCP server that provides this tool. */
  serverId: string
  /** Name of the MCP server. */
  serverName: string
  /** URL of the MCP server. */
  serverUrl: string
  /** Prefixed name to avoid collisions: `mcp_{serverName}_{toolName}`. */
  qualifiedName: string
}

/** Callback for connection state changes. */
type StateChangeCallback = (serverId: string, state: McpServerState) => void

export class McpManager {
  private clients = new Map<string, McpClient>()
  private states = new Map<string, McpServerState>()
  private tools = new Map<string, McpRegisteredTool>()
  private stateListeners = new Set<StateChangeCallback>()

  // ─── Server Lifecycle ───────────────────────────────────────────────────────

  /**
   * Connect to an MCP server and discover its tools.
   */
  async connectServer(config: McpServerConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      await this.disconnectServer(config.id)
    }

    this.setState(config.id, { connectionState: 'connecting', tools: [] })

    const client = new McpClient(config)
    this.clients.set(config.id, client)

    try {
      await client.initialize()

      const tools = await client.listTools()

      // Register tools with qualified names
      const registered = tools.map((tool) => this.registerTool(config, tool))

      this.setState(config.id, {
        connectionState: 'connected',
        tools,
      })

      mcpLogger.info(`Connected to MCP server "${config.name}" with ${registered.length} tools`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      mcpLogger.error(`Failed to connect to MCP server "${config.name}": ${message}`)

      this.setState(config.id, {
        connectionState: 'error',
        tools: [],
        error: message,
      })

      this.clients.delete(config.id)
      throw err
    }
  }

  /**
   * Disconnect from an MCP server and unregister its tools.
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId)
    if (client) {
      try {
        await client.close()
      } catch {
        // Ignore close errors
      }
      this.clients.delete(serverId)
    }

    // Remove tools from this server
    for (const [qualifiedName, tool] of this.tools) {
      if (tool.serverId === serverId) {
        this.tools.delete(qualifiedName)
      }
    }

    this.setState(serverId, { connectionState: 'disconnected', tools: [] })
  }

  /**
   * Disconnect all MCP servers.
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys())
    await Promise.allSettled(serverIds.map((id) => this.disconnectServer(id)))
  }

  /**
   * Reconnect to an MCP server (disconnect then connect).
   */
  async reconnectServer(config: McpServerConfig): Promise<void> {
    await this.disconnectServer(config.id)
    await this.connectServer(config)
  }

  // ─── Tool Discovery ─────────────────────────────────────────────────────────

  /**
   * Get all registered MCP tools across all connected servers.
   */
  getAllTools(): McpRegisteredTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools for a specific MCP server.
   */
  getToolsForServer(serverId: string): McpRegisteredTool[] {
    return Array.from(this.tools.values()).filter((t) => t.serverId === serverId)
  }

  /**
   * Find a tool by its qualified name (`mcp_{serverName}_{toolName}`).
   */
  findTool(qualifiedName: string): McpRegisteredTool | undefined {
    return this.tools.get(qualifiedName)
  }

  /**
   * Check if a tool name is an MCP tool (starts with `mcp_`).
   */
  isMcpTool(toolName: string): boolean {
    return toolName.startsWith('mcp_') && this.tools.has(toolName)
  }

  // ─── Tool Execution ─────────────────────────────────────────────────────────

  /**
   * Execute an MCP tool by its qualified name.
   */
  async callTool(
    qualifiedName: string,
    args: Record<string, unknown> = {},
  ): Promise<McpToolResult> {
    const tool = this.tools.get(qualifiedName)
    if (!tool) {
      throw new McpError(`Unknown MCP tool: ${qualifiedName}`)
    }

    const client = this.clients.get(tool.serverId)
    if (!client) {
      throw new McpError(`MCP server "${tool.serverName}" is not connected`)
    }

    mcpLogger.info(`Calling MCP tool: ${tool.name} on server "${tool.serverName}"`)

    return client.callTool(tool.name, args)
  }

  // ─── State Management ───────────────────────────────────────────────────────

  /**
   * Get the connection state for an MCP server.
   */
  getServerState(serverId: string): McpServerState {
    return (
      this.states.get(serverId) ?? {
        connectionState: 'disconnected' as McpConnectionState,
        tools: [],
      }
    )
  }

  /**
   * Subscribe to state changes for any MCP server.
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateListeners.add(callback)
    return () => this.stateListeners.delete(callback)
  }

  // ─── Manifest Generation ────────────────────────────────────────────────────

  /**
   * Generate an instruction block that teaches the agent about available MCP
   * tools and how to call them via HTTP/web_fetch.
   *
   * The agent is encouraged to call MCP server URLs directly using HTTP
   * (e.g. via web_fetch) following the MCP JSON-RPC protocol. The tool
   * listing includes server URLs so the agent can construct the requests.
   */
  generateToolManifest(): string {
    const tools = this.getAllTools()
    if (tools.length === 0) return ''

    // Group tools by server so we can show the URL once per server block
    const byServer = new Map<string, McpRegisteredTool[]>()
    for (const tool of tools) {
      const key = tool.serverId
      if (!byServer.has(key)) byServer.set(key, [])
      byServer.get(key)!.push(tool)
    }

    const lines = [
      'You have access to external MCP (Model Context Protocol) tools provided by the user.',
      'You are encouraged to call these MCP servers directly via HTTP using web_fetch or any available HTTP tool.',
      '',
      'To call an MCP tool, send a POST request to the server URL with a JSON-RPC body:',
      '',
      'POST <SERVER_URL>',
      'Content-Type: application/json',
      '',
      '{',
      '  "jsonrpc": "2.0",',
      '  "id": 1,',
      '  "method": "tools/call",',
      '  "params": {',
      '    "name": "<TOOL_NAME>",',
      '    "arguments": { ... }',
      '  }',
      '}',
      '',
      'If the tool is not available as a native tool, use HTTP web_fetch to call the MCP server directly.',
      "You SHOULD use these tools whenever they are relevant to the user's request.",
      '',
      '--- Available MCP Tools ---',
      '',
    ]

    for (const [, serverTools] of byServer) {
      const first = serverTools[0]
      lines.push(`## Server: ${first.serverName}`)
      lines.push(`URL: ${first.serverUrl}`)
      lines.push('')

      for (const tool of serverTools) {
        lines.push(`### ${tool.name}`)
        if (tool.description) {
          lines.push(tool.description)
        }
        if (tool.inputSchema?.properties) {
          const params: string[] = []
          for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
            const req = tool.inputSchema.required?.includes(name) ? ' (required)' : ''
            const desc = schema.description ? ` — ${schema.description}` : ''
            params.push(`  ${name}: ${schema.type}${req}${desc}`)
          }
          if (params.length > 0) {
            lines.push('Parameters:')
            lines.push(...params)
          }
        }
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private registerTool(config: McpServerConfig, tool: McpTool): McpRegisteredTool {
    const safeName = config.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const qualifiedName = `mcp_${safeName}_${tool.name}`

    const registered: McpRegisteredTool = {
      ...tool,
      serverId: config.id,
      serverName: config.name,
      serverUrl: config.url,
      qualifiedName,
    }

    this.tools.set(qualifiedName, registered)
    return registered
  }

  private setState(serverId: string, state: McpServerState): void {
    this.states.set(serverId, state)
    this.stateListeners.forEach((cb) => {
      try {
        cb(serverId, state)
      } catch {
        // Isolate listener errors
      }
    })
  }
}

/** Singleton MCP manager instance. */
let mcpManagerInstance: McpManager | null = null

export function getMcpManager(): McpManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new McpManager()
  }
  return mcpManagerInstance
}
