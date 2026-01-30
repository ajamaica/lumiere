import { useAtom } from 'jotai'
import { useCallback, useMemo } from 'react'

import {
  currentServerIdAtom,
  ServerConfig,
  serversAtom,
  ServersDict,
  serverSessionsAtom,
} from '../store'

export interface MoltConfig {
  url: string
  token: string
  clientId?: string
}

export interface UseServersResult {
  // State
  servers: ServersDict
  currentServerId: string
  currentServer: ServerConfig | null
  serversList: ServerConfig[]

  // Mutations
  addServer: (config: Omit<ServerConfig, 'id' | 'createdAt'>) => string
  updateServer: (id: string, updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>) => void
  removeServer: (id: string) => void
  switchToServer: (id: string) => void

  // Utilities
  getCurrentMoltConfig: () => MoltConfig | null
  getMoltConfigForServer: (id: string) => MoltConfig | null
}

export function useServers(): UseServersResult {
  const [servers, setServers] = useAtom(serversAtom)
  const [currentServerId, setCurrentServerId] = useAtom(currentServerIdAtom)

  // Derived state
  const currentServer = useMemo(
    () => servers[currentServerId] || null,
    [servers, currentServerId],
  )

  const serversList = useMemo(
    () => Object.values(servers).sort((a, b) => a.createdAt - b.createdAt),
    [servers],
  )

  // Add server with auto-generated UUID and name
  const addServer = useCallback(
    (config: Omit<ServerConfig, 'id' | 'createdAt'>) => {
      const id = generateUUID()
      const serverCount = Object.keys(servers).length
      const newServer: ServerConfig = {
        ...config,
        id,
        name: config.name || `Server ${serverCount + 1}`,
        createdAt: Date.now(),
      }

      setServers({ ...servers, [id]: newServer })

      // If this is the first server, make it current
      if (Object.keys(servers).length === 0) {
        setCurrentServerId(id)
      }

      return id
    },
    [servers, setServers, setCurrentServerId],
  )

  // Update server (merge partial updates)
  const updateServer = useCallback(
    (id: string, updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>) => {
      if (!servers[id]) return

      setServers({
        ...servers,
        [id]: { ...servers[id], ...updates },
      })
    },
    [servers, setServers],
  )

  // Remove server with safeguards
  const removeServer = useCallback(
    (id: string) => {
      if (!servers[id]) return

      const newServers = { ...servers }
      delete newServers[id]
      setServers(newServers)

      // If removing current server, switch to first available
      if (id === currentServerId) {
        const remaining = Object.keys(newServers)
        setCurrentServerId(remaining.length > 0 ? remaining[0] : '')
      }
    },
    [servers, currentServerId, setServers, setCurrentServerId],
  )

  // Switch active server
  const switchToServer = useCallback(
    (id: string) => {
      if (servers[id]) {
        setCurrentServerId(id)
      }
    },
    [servers, setCurrentServerId],
  )

  // Get MoltConfig for current server
  const getCurrentMoltConfig = useCallback((): MoltConfig | null => {
    if (!currentServer) return null
    return {
      url: currentServer.url,
      token: currentServer.token,
      clientId: currentServer.clientId,
    }
  }, [currentServer])

  // Get MoltConfig for specific server
  const getMoltConfigForServer = useCallback(
    (id: string): MoltConfig | null => {
      const server = servers[id]
      if (!server) return null
      return {
        url: server.url,
        token: server.token,
        clientId: server.clientId,
      }
    },
    [servers],
  )

  return {
    servers,
    currentServerId,
    currentServer,
    serversList,
    addServer,
    updateServer,
    removeServer,
    switchToServer,
    getCurrentMoltConfig,
    getMoltConfigForServer,
  }
}

// UUID generation helper
function generateUUID(): string {
  // Use crypto.randomUUID() if available, fallback to polyfill
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
