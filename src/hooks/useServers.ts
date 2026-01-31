import { useAtom } from 'jotai'
import { useCallback, useMemo } from 'react'

import { deleteServerToken, getServerToken, setServerToken } from '../services/secureTokenStorage'
import { currentServerIdAtom, ServerConfig, serversAtom, ServersDict } from '../store'

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
  addServer: (config: Omit<ServerConfig, 'id' | 'createdAt'>, token: string) => Promise<string>
  updateServer: (
    id: string,
    updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>,
    token?: string,
  ) => Promise<void>
  removeServer: (id: string) => Promise<void>
  switchToServer: (id: string) => void

  // Utilities
  getCurrentMoltConfig: () => Promise<MoltConfig | null>
  getMoltConfigForServer: (id: string) => Promise<MoltConfig | null>
}

export function useServers(): UseServersResult {
  const [servers, setServers] = useAtom(serversAtom)
  const [currentServerId, setCurrentServerId] = useAtom(currentServerIdAtom)

  // Derived state
  const currentServer = useMemo(() => servers[currentServerId] || null, [servers, currentServerId])

  const serversList = useMemo(
    () => Object.values(servers).sort((a, b) => a.createdAt - b.createdAt),
    [servers],
  )

  // Add server with auto-generated UUID and name
  const addServer = useCallback(
    async (config: Omit<ServerConfig, 'id' | 'createdAt'>, token: string) => {
      const id = generateUUID()
      const serverCount = Object.keys(servers).length
      const newServer: ServerConfig = {
        ...config,
        id,
        name: config.name || `Server ${serverCount + 1}`,
        createdAt: Date.now(),
      }

      // Store token securely in keychain
      await setServerToken(id, token)

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
    async (
      id: string,
      updates: Partial<Omit<ServerConfig, 'id' | 'createdAt'>>,
      token?: string,
    ) => {
      if (!servers[id]) return

      // Update token in keychain if provided
      if (token !== undefined) {
        await setServerToken(id, token)
      }

      setServers({
        ...servers,
        [id]: { ...servers[id], ...updates },
      })
    },
    [servers, setServers],
  )

  // Remove server with safeguards
  const removeServer = useCallback(
    async (id: string) => {
      if (!servers[id]) return

      // Delete token from keychain
      await deleteServerToken(id)

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
  const getCurrentMoltConfig = useCallback(async (): Promise<MoltConfig | null> => {
    if (!currentServer) return null
    const token = await getServerToken(currentServer.id)
    if (!token) return null
    return {
      url: currentServer.url,
      token,
      clientId: currentServer.clientId,
    }
  }, [currentServer])

  // Get MoltConfig for specific server
  const getMoltConfigForServer = useCallback(
    async (id: string): Promise<MoltConfig | null> => {
      const server = servers[id]
      if (!server) return null
      const token = await getServerToken(id)
      if (!token) return null
      return {
        url: server.url,
        token,
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
