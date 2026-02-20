// MCP (Model Context Protocol) Bridge Types

/** Transport type for connecting to MCP servers. */
export type McpTransport = 'sse' | 'streamable-http'

/** Configuration for a single MCP server connection. */
export interface McpServerConfig {
  /** Unique identifier for this MCP server. */
  id: string
  /** User-friendly display name. */
  name: string
  /** HTTP(S) endpoint URL for the MCP server. */
  url: string
  /** Transport mechanism. */
  transport: McpTransport
  /** Optional API key / bearer token for authentication. */
  apiKey?: string
  /** Whether this MCP server is enabled (tools will be registered). */
  enabled: boolean
  /** Timestamp when this config was created. */
  createdAt: number
}

/** Dictionary of MCP server configs keyed by ID. */
export interface McpServersDict {
  [id: string]: McpServerConfig
}

/** Connection state for an MCP server. */
export type McpConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/** Runtime state for a connected MCP server. */
export interface McpServerState {
  connectionState: McpConnectionState
  tools: McpTool[]
  error?: string
}

// ─── MCP Protocol Types (JSON-RPC 2.0) ─────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// ─── MCP Tool Types ─────────────────────────────────────────────────────────────

/** JSON Schema for a tool parameter. */
export interface McpToolInputSchema {
  type: 'object'
  properties?: Record<string, McpPropertySchema>
  required?: string[]
  additionalProperties?: boolean
}

export interface McpPropertySchema {
  type: string
  description?: string
  enum?: string[]
  items?: McpPropertySchema
  default?: unknown
}

/** An MCP tool as advertised by a server. */
export interface McpTool {
  /** Tool name (unique within a server). */
  name: string
  /** Human-readable description. */
  description?: string
  /** JSON Schema describing the tool's input parameters. */
  inputSchema: McpToolInputSchema
}

/** Result of calling an MCP tool. */
export interface McpToolResult {
  content: McpToolResultContent[]
  isError?: boolean
}

export interface McpToolResultContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

// ─── MCP Server Capabilities ────────────────────────────────────────────────────

export interface McpServerCapabilities {
  tools?: { listChanged?: boolean }
  resources?: { subscribe?: boolean; listChanged?: boolean }
  prompts?: { listChanged?: boolean }
}

export interface McpInitializeResult {
  protocolVersion: string
  capabilities: McpServerCapabilities
  serverInfo: {
    name: string
    version: string
  }
}
