import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  createChatProvider,
  HealthStatus,
  ProviderConfig,
  SendMessageParams,
} from '../services/providers'

export interface UseChatProviderResult {
  connected: boolean
  connecting: boolean
  error: string | null
  health: HealthStatus | null
  connect: () => Promise<void>
  disconnect: () => void
  refreshHealth: () => Promise<void>
  sendMessage: (
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ) => Promise<void>
  getChatHistory: (sessionKey: string, limit?: number) => Promise<ChatHistoryResponse>
  resetSession: (sessionKey: string) => Promise<void>
  listSessions: () => Promise<unknown>
}

/**
 * Provider-agnostic hook for chat functionality.
 *
 * Works with any ChatProvider (Molt, Ollama, etc.) based on the config.type.
 * Replaces useMoltGateway for the core chat flow while keeping the same
 * interface shape that ChatScreen and useMessageQueue expect.
 */
export function useChatProvider(config: ProviderConfig): UseChatProviderResult {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const providerRef = useRef<ChatProvider | null>(null)

  const connect = useCallback(async () => {
    if (connecting || connected) return

    setConnecting(true)
    setError(null)

    try {
      const provider = createChatProvider(config)
      providerRef.current = provider

      provider.onConnectionStateChange((isConnected, isReconnecting) => {
        setConnected(isConnected)
        setConnecting(isReconnecting)
        if (isReconnecting) {
          setError('Reconnecting...')
        } else if (isConnected) {
          setError(null)
        }
      })

      await provider.connect()
      setConnected(true)

      try {
        const healthStatus = await provider.getHealth()
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
    if (providerRef.current) {
      providerRef.current.disconnect()
      providerRef.current = null
    }
    setConnected(false)
    setHealth(null)
  }, [])

  const refreshHealth = useCallback(async () => {
    if (!providerRef.current) throw new Error('Provider not connected')
    const healthStatus = await providerRef.current.getHealth()
    setHealth(healthStatus)
  }, [])

  const sendMessage = useCallback(
    async (params: SendMessageParams, onEvent: (event: ChatProviderEvent) => void) => {
      if (!providerRef.current) throw new Error('Provider not connected')
      return await providerRef.current.sendMessage(params, onEvent)
    },
    [],
  )

  const getChatHistory = useCallback(
    async (sessionKey: string, limit?: number): Promise<ChatHistoryResponse> => {
      if (!providerRef.current) throw new Error('Provider not connected')
      return await providerRef.current.getChatHistory(sessionKey, limit)
    },
    [],
  )

  const resetSession = useCallback(async (sessionKey: string) => {
    if (!providerRef.current) throw new Error('Provider not connected')
    await providerRef.current.resetSession(sessionKey)
  }, [])

  const listSessions = useCallback(async () => {
    if (!providerRef.current) throw new Error('Provider not connected')
    return await providerRef.current.listSessions()
  }, [])

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect()
      }
    }
  }, [])

  return {
    connected,
    connecting,
    error,
    health,
    connect,
    disconnect,
    refreshHealth,
    sendMessage,
    getChatHistory,
    resetSession,
    listSessions,
  }
}
