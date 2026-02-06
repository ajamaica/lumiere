import { useCallback, useEffect, useRef, useState } from 'react'

import { MoltGatewayClient } from '../services/molt/client'
import { MoltConfig } from '../services/molt/types'
import { ServerConfig } from '../store'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

export interface ServerSessions {
  serverId: string
  sessions: Session[]
  connected: boolean
  loading: boolean
}

interface MoltConnection {
  client: MoltGatewayClient
  connected: boolean
}

export function useAllServerSessions(
  servers: ServerConfig[],
  getToken: (serverId: string) => Promise<string | null>,
) {
  const [serverSessions, setServerSessions] = useState<Map<string, ServerSessions>>(new Map())
  const connectionsRef = useRef<Map<string, MoltConnection>>(new Map())

  // Connect to a molt server and load its sessions
  const connectAndLoadSessions = useCallback(
    async (server: ServerConfig) => {
      try {
        const token = await getToken(server.id)
        if (!token && server.providerType === 'molt') {
          return
        }

        const config: MoltConfig = {
          url: server.url,
          token: token || '',
        }

        // Create client
        const client = new MoltGatewayClient(config)
        await client.connect()

        // Store connection
        connectionsRef.current.set(server.id, {
          client,
          connected: true,
        })

        // Load sessions
        const sessionData = (await client.listSessions()) as { sessions?: Session[] }
        const sessions = sessionData?.sessions || []

        setServerSessions((prev) => {
          const newMap = new Map(prev)
          newMap.set(server.id, {
            serverId: server.id,
            sessions,
            connected: true,
            loading: false,
          })
          return newMap
        })
      } catch (err) {
        console.error(`Failed to connect to server ${server.id}:`, err)
        setServerSessions((prev) => {
          const newMap = new Map(prev)
          newMap.set(server.id, {
            serverId: server.id,
            sessions: [],
            connected: false,
            loading: false,
          })
          return newMap
        })
      }
    },
    [getToken],
  )

  // Load sessions for all molt servers
  const loadAllSessions = useCallback(async () => {
    // Only load sessions for molt servers
    const moltServers = servers.filter((s) => s.providerType === 'molt')

    // Set loading state for all servers
    setServerSessions((prev) => {
      const newMap = new Map(prev)
      for (const server of moltServers) {
        newMap.set(server.id, {
          serverId: server.id,
          sessions: prev.get(server.id)?.sessions || [],
          connected: prev.get(server.id)?.connected || false,
          loading: true,
        })
      }
      return newMap
    })

    // Connect and load sessions for each server
    await Promise.all(moltServers.map((server) => connectAndLoadSessions(server)))
  }, [servers, connectAndLoadSessions])

  // Initial load
  useEffect(() => {
    loadAllSessions()

    // Cleanup on unmount
    return () => {
      const connections = connectionsRef.current
      connections.forEach((connection) => {
        if (connection.client) {
          connection.client.disconnect()
        }
      })
      connections.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload sessions for a specific server
  const reloadServerSessions = useCallback(async (serverId: string) => {
    const connection = connectionsRef.current.get(serverId)
    if (!connection || !connection.connected) {
      return
    }

    try {
      const sessionData = (await connection.client.listSessions()) as { sessions?: Session[] }
      const sessions = sessionData?.sessions || []

      setServerSessions((prev) => {
        const newMap = new Map(prev)
        newMap.set(serverId, {
          serverId,
          sessions,
          connected: true,
          loading: false,
        })
        return newMap
      })
    } catch (err) {
      console.error(`Failed to reload sessions for server ${serverId}:`, err)
    }
  }, [])

  return {
    serverSessions,
    loadAllSessions,
    reloadServerSessions,
  }
}
