#!/usr/bin/env node
import { startServer } from './mcp/server.js'

startServer().catch((error) => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
