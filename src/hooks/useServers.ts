import { type PrimitiveAtom, useAtom } from 'jotai'
import { useCallback, useEffect, useMemo } from 'react'
import { Platform } from 'react-native'

import { ProviderConfig } from '../services/providers'
import { deleteServerToken, getServerToken, setServerToken } from '../services/secureTokenStorage'
import {
  currentServerIdAtom,
  persistSecureServers,
  secureServersAtom,
  secureStoreHydratedAtom,
  ServerConfig,
  serversAtom,
  ServersDict,
} from '../store'

// Both atoms hold ServersDict — cast to a common type so the conditional
// expression satisfies useAtom's overload without collapsing to `never`.
const webAtom = secureServersAtom as PrimitiveAtom<ServersDict>
const nativeAtom = serversAtom as unknown as PrimitiveAtom<ServersDict>

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
  getProviderConfig: () => Promise<ProviderConfig | null>
  getProviderConfigForServer: (id: string) => Promise<ProviderConfig | null>
}

export function useServers(): UseServersResult {
  const isWeb = Platform.OS === 'web'

  // On web, use the password-encrypted secure atom.
  // On native, use the normal AsyncStorage-backed atom.
  const [servers, setServers] = useAtom(isWeb ? webAtom : nativeAtom)
  const [currentServerId, setCurrentServerId] = useAtom(currentServerIdAtom)
  const [hydrated] = useAtom(secureStoreHydratedAtom)

  // Auto-persist encrypted servers whenever the atom changes (web only)
  useEffect(() => {
    if (!isWeb || !hydrated) return
    persistSecureServers(servers)
  }, [servers, isWeb, hydrated])

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

      // Always make the newly added server the current one.
      // We cannot rely on switchToServer() called after addServer()
      // because it closes over the stale servers state that does not
      // yet include the new server.
      setCurrentServerId(id)

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

  // Get ProviderConfig for current server
  const getProviderConfig = useCallback(async (): Promise<ProviderConfig | null> => {
    if (!currentServer) return null
    const token = await getServerToken(currentServer.id)
    // Ollama, Echo, and Apple don't require a token, Molt does
    if (
      !token &&
      currentServer.providerType !== 'ollama' &&
      currentServer.providerType !== 'echo' &&
      currentServer.providerType !== 'apple'
    )
      return null
    return {
      type: currentServer.providerType || 'molt',
      url: currentServer.url,
      token: token || '',
      clientId: currentServer.clientId,
      model: currentServer.model,
      serverId: currentServer.id,
    }
  }, [currentServer])

  // Get ProviderConfig for specific server
  const getProviderConfigForServer = useCallback(
    async (id: string): Promise<ProviderConfig | null> => {
      const server = servers[id]
      if (!server) return null
      const token = await getServerToken(id)
      if (
        !token &&
        server.providerType !== 'ollama' &&
        server.providerType !== 'echo' &&
        server.providerType !== 'apple'
      )
        return null
      return {
        type: server.providerType || 'molt',
        url: server.url,
        token: token || '',
        clientId: server.clientId,
        model: server.model,
        serverId: id,
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
    getProviderConfig,
    getProviderConfigForServer,
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
