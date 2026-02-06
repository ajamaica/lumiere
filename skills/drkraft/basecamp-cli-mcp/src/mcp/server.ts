import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

import { NAME, VERSION } from '../lib/version.js'
import { executeTool, getTools } from './tools/index.js'

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: NAME,
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register tool handlers
  setupToolHandlers(server)

  return server
}

/**
 * Setup tool-related request handlers
 */
function setupToolHandlers(server: Server): void {
  // Handle tools/list request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await getTools()
    return { tools }
  })

  // Handle tools/call request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      const result = await executeTool(name, args || {})
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      }
    }
  })
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Log to stderr so it doesn't interfere with JSON-RPC on stdout
  console.error('Basecamp MCP server running on stdio')
}
