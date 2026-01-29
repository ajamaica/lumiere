import { useState, useEffect, useCallback, useRef } from 'react'
import { MoltGatewayClient } from './client'
import {
  MoltConfig,
  ConnectResponse,
  HealthStatus,
  SendMessageParams,
  AgentParams,
  AgentEvent,
  EventFrame,
} from './types'

export interface UseMoltGatewayResult {
  client: MoltGatewayClient | null
  connected: boolean
  connecting: boolean
  error: string | null
  health: HealthStatus | null
  connect: () => Promise<void>
  disconnect: () => void
  sendMessage: (params: SendMessageParams) => Promise<unknown>
  sendAgentRequest: (params: AgentParams, onEvent?: (event: AgentEvent) => void) => Promise<unknown>
  getChatHistory: (sessionKey: string, limit?: number) => Promise<unknown>
  resetSession: (sessionKey: string) => Promise<unknown>
  listSessions: () => Promise<unknown>
}

export function useMoltGateway(config: MoltConfig): UseMoltGatewayResult {
  const [client, setClient] = useState<MoltGatewayClient | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const clientRef = useRef<MoltGatewayClient | null>(null)

  const connect = useCallback(async () => {
    if (connecting || connected) {
      return
    }

    setConnecting(true)
    setError(null)

    try {
      const newClient = new MoltGatewayClient(config)
      clientRef.current = newClient

      const response = await newClient.connect()
      console.log('Connected to Molt Gateway:', response)

      setClient(newClient)
      setConnected(true)

      // Set up event listeners
      newClient.addEventListener((event: EventFrame) => {
        console.log('Gateway event:', event)

        if (event.event === 'shutdown') {
          setConnected(false)
        }
      })

      // Fetch initial health status
      try {
        const healthStatus = await newClient.getHealth()
        setHealth(healthStatus)
      } catch (err) {
        console.error('Failed to fetch health:', err)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      console.error('Failed to connect:', err)
    } finally {
      setConnecting(false)
    }
  }, [config, connecting, connected])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    setClient(null)
    setConnected(false)
    setHealth(null)
  }, [])

  const sendMessage = useCallback(
    async (params: SendMessageParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.sendMessage(params)
    },
    [client]
  )

  const sendAgentRequest = useCallback(
    async (params: AgentParams, onEvent?: (event: AgentEvent) => void) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.sendAgentRequest(params, onEvent)
    },
    [client]
  )

  const getChatHistory = useCallback(
    async (sessionKey: string, limit?: number) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.getChatHistory(sessionKey, limit)
    },
    [client]
  )

  const resetSession = useCallback(
    async (sessionKey: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.resetSession(sessionKey)
    },
    [client]
  )

  const listSessions = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    return await client.listSessions()
  }, [client])

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
      }
    }
  }, [])

  return {
    client,
    connected,
    connecting,
    error,
    health,
    connect,
    disconnect,
    sendMessage,
    sendAgentRequest,
    getChatHistory,
    resetSession,
    listSessions,
  }
}
