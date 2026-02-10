import { useCallback, useEffect, useRef, useState } from 'react'

import { logger } from '../../utils/logger'
import { MoltGatewayClient } from './client'
import {
  AgentEvent,
  AgentParams,
  ClawHubSearchParams,
  ClawHubSearchResponse,
  ConnectResponse,
  EventFrame,
  GatewaySnapshot,
  HealthStatus,
  MoltConfig,
  SendMessageParams,
  Skill,
  SkillsListResponse,
  TeachSkillParams,
  UpdateSkillParams,
} from './types'

const gatewayLogger = logger.create('MoltGateway')

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
  teachSkill: (params: TeachSkillParams) => Promise<Skill>
  listSkills: () => Promise<SkillsListResponse>
  removeSkill: (name: string) => Promise<unknown>
  updateSkill: (params: UpdateSkillParams) => Promise<Skill>
  searchClawHub: (params: ClawHubSearchParams) => Promise<ClawHubSearchResponse>
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
  const connectingRef = useRef(false)

  const connect = useCallback(async () => {
    // Use refs for guards to avoid stale closure issues when called from
    // effects whose cleanup (disconnect) already ran synchronously.
    if (connectingRef.current || clientRef.current) {
      return
    }

    connectingRef.current = true
    setConnecting(true)
    setError(null)

    try {
      const newClient = new MoltGatewayClient(config)
      clientRef.current = newClient

      const response = await newClient.connect()
      gatewayLogger.info('Connected to Molt Gateway', response)

      setClient(newClient)
      setConnected(true)
      setConnectResponse(response)
      setSnapshot(response.snapshot || null)

      // Set up event listeners
      newClient.addEventListener((event: EventFrame) => {
        gatewayLogger.info('Gateway event', event)

        if (event.event === 'shutdown') {
          setConnected(false)
          setError('Gateway shutdown')
        }
      })

      // Set up connection state listener
      newClient.onConnectionStateChange((isConnected, reconnecting) => {
        gatewayLogger.info(
          `Connection state: connected=${isConnected}, reconnecting=${reconnecting}`,
        )
        setConnected(isConnected)
        setConnecting(reconnecting)
        if (reconnecting) {
          setError('Reconnecting...')
        } else if (isConnected) {
          setError(null)
        }
      })

      // Fetch initial health status
      try {
        const healthStatus = await newClient.getHealth()
        setHealth(healthStatus)
      } catch (err) {
        gatewayLogger.logError('Failed to fetch health', err)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      gatewayLogger.logError('Failed to connect', err)
    } finally {
      connectingRef.current = false
      setConnecting(false)
    }
  }, [config])

  const disconnect = useCallback(() => {
    connectingRef.current = false
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
    const healthStatus = await client.getHealth()
    setHealth(healthStatus)
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
      return null
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

  const teachSkill = useCallback(
    async (params: TeachSkillParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.teachSkill(params)
    },
    [client],
  )

  const listSkills = useCallback(async () => {
    if (!client) {
      throw new Error('Client not connected')
    }
    return await client.listSkills()
  }, [client])

  const removeSkill = useCallback(
    async (name: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.removeSkill(name)
    },
    [client],
  )

  const updateSkill = useCallback(
    async (params: UpdateSkillParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.updateSkill(params)
    },
    [client],
  )

  const searchClawHub = useCallback(
    async (params: ClawHubSearchParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.searchClawHub(params)
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
    teachSkill,
    listSkills,
    removeSkill,
    updateSkill,
    searchClawHub,
  }
}
