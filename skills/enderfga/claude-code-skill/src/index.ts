/**
 * OpenClaw Claude Code Skill
 *
 * A skill package that enables:
 * - MCP (Model Context Protocol) integration for sub-agent orchestration
 * - State persistence and context recovery
 * - Session management and synchronization
 */

export * from './mcp'
export * from './store'

// Re-export commonly used types
export type {
  McpConfigData,
  McpRequestMessage,
  McpResponseMessage,
  PresetServer,
  ServerConfig,
  ServerStatus,
  ServerStatusResponse,
} from './mcp/types'

// Re-export commonly used functions
export {
  addMcpServer,
  executeMcpAction,
  getAllTools,
  getClientsStatus,
  initializeMcpSystem,
  pauseMcpServer,
  removeMcpServer,
  resumeMcpServer,
  setConfigPath,
} from './mcp/actions'
export { indexedDBStorage } from './store/indexeddb-storage'
export { createPersistStore } from './store/persist'
export { mergeKeyValueStore, mergeSessions, mergeWithUpdate } from './store/sync'
