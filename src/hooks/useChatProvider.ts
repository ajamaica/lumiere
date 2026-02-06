import { useCallback, useEffect, useRef, useState } from 'react'

import {
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  createChatProvider,
  HealthStatus,
  ProviderCapabilities,
  ProviderConfig,
  SendMessageParams,
} from '../services/providers'
import { logger } from '../utils/logger'

const providerLogger = logger.create('ChatProvider')

/** Default capabilities before a provider is connected */
const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  imageAttachments: false,
  serverSessions: false,
  persistentHistory: false,
  scheduler: false,
  gatewaySnapshot: false,
}

export interface UseChatProviderResult {
  connected: boolean
  connecting: boolean
  error: string | null
  health: HealthStatus | null
  capabilities: ProviderCapabilities
  retry: () => void
  sendMessage: (
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ) => Promise<void>
  getChatHistory: (sessionKey: string, limit?: number) => Promise<ChatHistoryResponse>
  resetSession: (sessionKey: string) => Promise<void>
  listSessions: () => Promise<unknown>
}

/** Derive a stable string key from the config so we can detect changes */
function configKey(config: ProviderConfig): string {
  return `${config.type}|${config.url}|${config.token}|${config.clientId ?? ''}|${config.model ?? ''}|${config.serverId ?? ''}`
}

/**
 * Provider-agnostic hook for chat functionality.
 *
 * Automatically connects when mounted and disconnects on unmount.
 * When config changes, the old provider is disconnected and a new one
 * is created and connected.
 */
export function useChatProvider(config: ProviderConfig): UseChatProviderResult {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [capabilities, setCapabilities] = useState<ProviderCapabilities>(DEFAULT_CAPABILITIES)
  const providerRef = useRef<ChatProvider | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Derive a stable key for the config to use as an effect dependency
  const key = configKey(config)

  // Auto-connect when config changes (or on initial mount)
  useEffect(() => {
    let cancelled = false
    let unsubConnectionState: (() => void) | null = null

    const doConnect = async () => {
      // Clean up any existing provider
      if (providerRef.current) {
        providerRef.current.disconnect()
        providerRef.current = null
      }

      setConnected(false)
      setConnecting(true)
      setError(null)
      setHealth(null)

      try {
        const provider = createChatProvider(config)
        if (cancelled) {
          provider.disconnect()
          return
        }

        providerRef.current = provider
        setCapabilities(provider.capabilities)

        unsubConnectionState = provider.onConnectionStateChange((isConnected, isReconnecting) => {
          if (cancelled) return
          setConnected(isConnected)
          setConnecting(isReconnecting)
          if (isReconnecting) {
            setError('Reconnecting...')
          } else if (isConnected) {
            setError(null)
          }
        })

        await provider.connect()

        if (cancelled) {
          provider.disconnect()
          return
        }

        setConnected(true)
        setConnecting(false)

        // Fetch initial health
        try {
          const healthStatus = await provider.getHealth()
          if (!cancelled) {
            setHealth(healthStatus)
          }
        } catch (err) {
          providerLogger.logError('Failed to fetch health', err)
        }
      } catch (err) {
        if (cancelled) return
        const errorMessage = err instanceof Error ? err.message : 'Connection failed'
        setError(errorMessage)
        setConnecting(false)
        providerLogger.logError('Failed to connect', err)
      }
    }

    doConnect()

    return () => {
      cancelled = true
      if (unsubConnectionState) {
        unsubConnectionState()
      }
      if (providerRef.current) {
        providerRef.current.disconnect()
        providerRef.current = null
      }
      setConnected(false)
      setConnecting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, retryCount])

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1)
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

  return {
    connected,
    connecting,
    error,
    health,
    capabilities,
    retry,
    sendMessage,
    getChatHistory,
    resetSession,
    listSessions,
  }
}
