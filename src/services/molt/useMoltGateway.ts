import { useCallback, useEffect, useRef, useState } from 'react'

import { MoltGatewayClient } from './client'
import {
  AgentEvent,
  AgentParams,
  ConnectResponse,
  EventFrame,
  GatewaySnapshot,
  HealthStatus,
  MediaUploadResponse,
  MoltConfig,
  SendMessageParams,
} from './types'

export interface UseMoltGatewayResult {
  client: MoltGatewayClient | null
  connected: boolean
  connecting: boolean
  error: string | null
  health: HealthStatus | null
  snapshot: GatewaySnapshot | null
  connectResponse: ConnectResponse | null
  connect: () => Promise<void>
  disconnect: () => void
  refreshHealth: () => Promise<void>
  sendMessage: (params: SendMessageParams) => Promise<unknown>
  sendAgentRequest: (params: AgentParams, onEvent?: (event: AgentEvent) => void) => Promise<unknown>
  uploadMedia: (
    files: { uri: string; mimeType: string; name: string }[],
  ) => Promise<MediaUploadResponse>
  getChatHistory: (sessionKey: string, limit?: number) => Promise<unknown>
  resetSession: (sessionKey: string) => Promise<unknown>
  listSessions: () => Promise<unknown>
  getSchedulerStatus: () => Promise<unknown>
  listCronJobs: () => Promise<unknown>
  disableCronJob: (jobName: string) => Promise<unknown>
  enableCronJob: (jobName: string) => Promise<unknown>
  runCronJob: (jobName: string) => Promise<unknown>
  removeCronJob: (jobName: string) => Promise<unknown>
  getCronJobRuns: (jobName: string) => Promise<unknown>
}

export function useMoltGateway(config: MoltConfig): UseMoltGatewayResult {
  const [client, setClient] = useState<MoltGatewayClient | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [snapshot, setSnapshot] = useState<GatewaySnapshot | null>(null)
  const [connectResponse, setConnectResponse] = useState<ConnectResponse | null>(null)
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
      setConnectResponse(response)
      setSnapshot(response.snapshot || null)

      // Set up event listeners
      newClient.addEventListener((event: EventFrame) => {
        console.log('Gateway event:', event)

        if (event.event === 'shutdown') {
          setConnected(false)
          setError('Gateway shutdown')
        }
      })

      // Set up connection state listener
      newClient.onConnectionStateChange((connected, reconnecting) => {
        console.log(`Connection state: connected=${connected}, reconnecting=${reconnecting}`)
        setConnected(connected)
        setConnecting(reconnecting)
        if (reconnecting) {
          setError('Reconnecting...')
        } else if (connected) {
          setError(null)
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
    setSnapshot(null)
    setConnectResponse(null)
  }, [])

  const refreshHealth = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    try {
      const healthStatus = await client.getHealth()
      setHealth(healthStatus)
    } catch (err) {
      console.error('Failed to refresh health:', err)
      throw err
    }
  }, [client])

  const sendMessage = useCallback(
    async (params: SendMessageParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.sendMessage(params)
    },
    [client],
  )

  const sendAgentRequest = useCallback(
    async (params: AgentParams, onEvent?: (event: AgentEvent) => void) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.sendAgentRequest(params, onEvent)
    },
    [client],
  )

  const uploadMedia = useCallback(
    async (files: { uri: string; mimeType: string; name: string }[]) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.uploadMedia(files)
    },
    [client],
  )

  const getChatHistory = useCallback(
    async (sessionKey: string, limit?: number) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.getChatHistory(sessionKey, limit)
    },
    [client],
  )

  const resetSession = useCallback(
    async (sessionKey: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.resetSession(sessionKey)
    },
    [client],
  )

  const listSessions = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    return await client.listSessions()
  }, [client])

  const getSchedulerStatus = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    return await client.getSchedulerStatus()
  }, [client])

  const listCronJobs = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    return await client.listCronJobs()
  }, [client])

  const disableCronJob = useCallback(
    async (jobName: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.disableCronJob(jobName)
    },
    [client],
  )

  const enableCronJob = useCallback(
    async (jobName: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.enableCronJob(jobName)
    },
    [client],
  )

  const runCronJob = useCallback(
    async (jobName: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.runCronJob(jobName)
    },
    [client],
  )

  const removeCronJob = useCallback(
    async (jobName: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.removeCronJob(jobName)
    },
    [client],
  )

  const getCronJobRuns = useCallback(
    async (jobName: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.getCronJobRuns(jobName)
    },
    [client],
  )

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
    snapshot,
    connectResponse,
    connect,
    disconnect,
    refreshHealth,
    sendMessage,
    sendAgentRequest,
    uploadMedia,
    getChatHistory,
    resetSession,
    listSessions,
    getSchedulerStatus,
    listCronJobs,
    disableCronJob,
    enableCronJob,
    runCronJob,
    removeCronJob,
    getCronJobRuns,
  }
}
