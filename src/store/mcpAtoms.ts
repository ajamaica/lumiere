import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { McpConnectionState, McpServersDict, McpTool } from '../services/mcp/types'
import { storage } from './storage'

/** Persisted MCP server configurations keyed by ID. */
export const mcpServersAtom = atomWithStorage<McpServersDict>('mcpServers', {}, storage)

/** Runtime connection states for MCP servers (not persisted). */
export const mcpConnectionStatesAtom = atom<Record<string, McpConnectionState>>({})

/** Runtime discovered tools per MCP server (not persisted). */
export const mcpServerToolsAtom = atom<Record<string, McpTool[]>>({})

/** Connection errors per MCP server (not persisted). */
export const mcpConnectionErrorsAtom = atom<Record<string, string | undefined>>({})
