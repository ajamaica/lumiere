import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import type { McpConnectionState, McpServerConfig, McpServersDict, McpTool } from '../services/mcp'
import { getMcpManager } from '../services/mcp'
import {
  mcpConnectionErrorsAtom,
  mcpConnectionStatesAtom,
  mcpServersAtom,
  mcpServerToolsAtom,
} from '../store/mcpAtoms'

export interface UseMcpServersResult {
  /** All MCP server configs. */
  servers: McpServersDict
  /** Sorted list of MCP server configs. */
  serversList: McpServerConfig[]
  /** Connection state per server ID. */
  connectionStates: Record<string, McpConnectionState>
  /** Discovered tools per server ID. */
  serverTools: Record<string, McpTool[]>
  /** Connection errors per server ID. */
  connectionErrors: Record<string, string | undefined>
  /** Total number of available MCP tools across all servers. */
  totalToolCount: number

  /** Add a new MCP server. Returns the server ID. */
  addServer: (config: Omit<McpServerConfig, 'id' | 'createdAt'>) => string
  /** Update an existing MCP server config. */
  updateServer: (id: string, updates: Partial<Omit<McpServerConfig, 'id' | 'createdAt'>>) => void
  /** Remove an MCP server. */
  removeServer: (id: string) => Promise<void>
  /** Connect to an MCP server. */
  connectServer: (id: string) => Promise<void>
  /** Disconnect from an MCP server. */
  disconnectServer: (id: string) => Promise<void>
  /** Reconnect to an MCP server. */
  reconnectServer: (id: string) => Promise<void>
}

export function useMcpServers(): UseMcpServersResult {
  const [serversRaw, setServers] = useAtom(mcpServersAtom)
  const [connectionStates, setConnectionStates] = useAtom(mcpConnectionStatesAtom)
  const [serverTools, setServerTools] = useAtom(mcpServerToolsAtom)
  const [connectionErrors, setConnectionErrors] = useAtom(mcpConnectionErrorsAtom)
  const manager = useMemo(() => getMcpManager(), [])
  const unsubRef = useRef<(() => void) | null>(null)

  // Guard the Promise case for type safety (won't occur at runtime after hydration)
  const servers: McpServersDict = useMemo(
    () => (serversRaw instanceof Promise ? {} : serversRaw),
    [serversRaw],
  )

  // Subscribe to MCP manager state changes
  useEffect(() => {
    unsubRef.current = manager.onStateChange((serverId, state) => {
      setConnectionStates((prev) => ({
        ...prev,
        [serverId]: state.connectionState,
      }))
      setServerTools((prev) => ({
        ...prev,
        [serverId]: state.tools,
      }))
      setConnectionErrors((prev) => ({
        ...prev,
        [serverId]: state.error,
      }))
    })

    return () => {
      unsubRef.current?.()
    }
  }, [manager, setConnectionStates, setServerTools, setConnectionErrors])

  // Auto-connect enabled servers on mount
  useEffect(() => {
    const enabledServers = Object.values(servers).filter((s) => s.enabled)
    for (const server of enabledServers) {
      const state = manager.getServerState(server.id)
      if (state.connectionState === 'disconnected') {
        manager.connectServer(server).catch(() => {
          // Error is captured in state via the listener
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const serversList = useMemo(
    () => Object.values(servers).sort((a, b) => a.createdAt - b.createdAt),
    [servers],
  )

  const totalToolCount = useMemo(() => {
    return Object.values(serverTools).reduce((sum, tools) => sum + tools.length, 0)
  }, [serverTools])

  const addServer = useCallback(
    (config: Omit<McpServerConfig, 'id' | 'createdAt'>) => {
      const id = generateId()
      const newServer: McpServerConfig = {
        ...config,
        id,
        createdAt: Date.now(),
      }
      setServers({ ...servers, [id]: newServer })

      // Auto-connect if enabled
      if (newServer.enabled) {
        manager.connectServer(newServer).catch(() => {
          // Error captured in state
        })
      }

      return id
    },
    [servers, setServers, manager],
  )

  const updateServer = useCallback(
    (id: string, updates: Partial<Omit<McpServerConfig, 'id' | 'createdAt'>>) => {
      if (!servers[id]) return
      setServers({ ...servers, [id]: { ...servers[id], ...updates } })
    },
    [servers, setServers],
  )

  const removeServer = useCallback(
    async (id: string) => {
      await manager.disconnectServer(id)
      const next = { ...servers }
      delete next[id]
      setServers(next)
    },
    [servers, setServers, manager],
  )

  const connectServer = useCallback(
    async (id: string) => {
      const config = servers[id]
      if (!config) return
      await manager.connectServer(config)
    },
    [servers, manager],
  )

  const disconnectServer = useCallback(
    async (id: string) => {
      await manager.disconnectServer(id)
    },
    [manager],
  )

  const reconnectServer = useCallback(
    async (id: string) => {
      const config = servers[id]
      if (!config) return
      await manager.reconnectServer(config)
    },
    [servers, manager],
  )

  return {
    servers,
    serversList,
    connectionStates,
    serverTools,
    connectionErrors,
    totalToolCount,
    addServer,
    updateServer,
    removeServer,
    connectServer,
    disconnectServer,
    reconnectServer,
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
