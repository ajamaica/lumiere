import { useCallback, useEffect, useRef, useState } from 'react'

import { logger } from '../../utils/logger'
import { MoltGatewayClient } from './client'
import {
  AgentEvent,
  AgentParams,
  ChatAttachmentPayload,
  ChatSendResponse,
  ConnectionState,
  ConnectResponse,
  GatewayLogsParams,
  GatewayLogsResponse,
  GatewaySnapshot,
  HealthStatus,
  MoltConfig,
  SendMessageParams,
  SessionsSpawnParams,
  SessionsSpawnResponse,
  Skill,
  SkillsListResponse,
  SubagentEvent,
  SubagentsListResponse,
  TeachSkillParams,
  UpdateSkillParams,
} from './types'

const gatewayLogger = logger.create('MoltGateway')

export interface UseMoltGatewayResult {
  client: MoltGatewayClient | null
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  awaitingApproval: boolean
  error: string | null
  health: HealthStatus | null
  snapshot: GatewaySnapshot | null
  connectResponse: ConnectResponse | null
  connect: () => Promise<void>
  disconnect: () => void
  retryConnection: () => Promise<void>
  refreshHealth: () => Promise<void>
  sendMessage: (params: SendMessageParams) => Promise<unknown>
  chatSend: (
    sessionKey: string,
    message: string,
    options?: {
      thinking?: string
      attachments?: ChatAttachmentPayload[]
      idempotencyKey?: string
      timeoutMs?: number
    },
  ) => Promise<ChatSendResponse>
  chatAbort: (sessionKey: string, runId: string) => Promise<void>
  sendAgentRequest: (params: AgentParams, onEvent?: (event: AgentEvent) => void) => Promise<unknown>
  getChatHistory: (sessionKey: string, limit?: number) => Promise<unknown>
  resetSession: (sessionKey: string) => Promise<unknown>
  deleteSession: (sessionKey: string) => Promise<unknown>
  listSessions: () => Promise<unknown>
  getSchedulerStatus: () => Promise<unknown>
  listCronJobs: () => Promise<unknown>
  disableCronJob: (jobId: string) => Promise<unknown>
  enableCronJob: (jobId: string) => Promise<unknown>
  runCronJob: (jobId: string, mode?: 'force' | 'due') => Promise<unknown>
  removeCronJob: (jobId: string) => Promise<unknown>
  getCronJobRuns: (jobId: string) => Promise<unknown>
  teachSkill: (params: TeachSkillParams) => Promise<Skill>
  listSkills: () => Promise<SkillsListResponse>
  removeSkill: (name: string) => Promise<unknown>
  updateSkill: (params: UpdateSkillParams) => Promise<Skill>
  getLogs: (params?: GatewayLogsParams) => Promise<GatewayLogsResponse>
  spawnSubagent: (params: SessionsSpawnParams) => Promise<SessionsSpawnResponse>
  listSubagents: (sessionKey?: string) => Promise<SubagentsListResponse>
  stopSubagent: (runId: string) => Promise<void>
  onSubagentEvent: (callback: (event: SubagentEvent) => void) => () => void
}

/** Derive boolean flags from the ConnectionState enum. */
function deriveStateFlags(state: ConnectionState) {
  return {
    connected: state === 'connected',
    connecting: state === 'connecting',
    reconnecting: state === 'reconnecting',
    awaitingApproval: state === 'awaitingApproval',
  }
}

export function useMoltGateway(config: MoltConfig): UseMoltGatewayResult {
  const [client, setClient] = useState<MoltGatewayClient | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [awaitingApproval, setAwaitingApproval] = useState(false)
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

      // Subscribe to connection state changes BEFORE connect() so we
      // catch awaitingApproval during the initial handshake attempt.
      newClient.onConnectionStateChange((state: ConnectionState) => {
        const flags = deriveStateFlags(state)
        gatewayLogger.info(`Connection state: ${state}`)
        setConnected(flags.connected)
        setConnecting(flags.connecting)
        setReconnecting(flags.reconnecting)
        setAwaitingApproval(flags.awaitingApproval)

        if (flags.awaitingApproval) {
          setError(null)
        } else if (flags.reconnecting) {
          setError('Reconnecting...')
        } else if (flags.connected) {
          setError(null)
          setAwaitingApproval(false)
        }
      })

      // Subscribe to shutdown events
      newClient.on('shutdown', () => {
        setConnected(false)
        setError('Gateway shutdown')
      })

      const response = await newClient.connect()
      gatewayLogger.info('Connected to Molt Gateway', response)

      setClient(newClient)
      setConnected(true)
      setAwaitingApproval(false)
      setConnectResponse(response)
      setSnapshot(response.snapshot || null)

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
    setConnecting(false)
    setReconnecting(false)
    setAwaitingApproval(false)
    setHealth(null)
    setSnapshot(null)
    setConnectResponse(null)
  }, [])

  const retryConnection = useCallback(async () => {
    if (!clientRef.current) {
      // No existing client — do a fresh connect
      return connect()
    }
    setError(null)
    try {
      const response = await clientRef.current.retryConnection()
      setConnected(true)
      setConnectResponse(response)
      setSnapshot(response.snapshot || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed'
      setError(errorMessage)
      gatewayLogger.logError('Failed to retry connection', err)
    }
  }, [connect])

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

  const chatSend = useCallback(
    async (
      sessionKey: string,
      message: string,
      options?: {
        thinking?: string
        attachments?: ChatAttachmentPayload[]
        idempotencyKey?: string
        timeoutMs?: number
      },
    ) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.chatSend(sessionKey, message, options)
    },
    [client],
  )

  const chatAbort = useCallback(
    async (sessionKey: string, runId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.chatAbort(sessionKey, runId)
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

  const deleteSession = useCallback(
    async (sessionKey: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.deleteSession(sessionKey)
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
    async (jobId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.disableCronJob(jobId)
    },
    [client],
  )

  const enableCronJob = useCallback(
    async (jobId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.enableCronJob(jobId)
    },
    [client],
  )

  const runCronJob = useCallback(
    async (jobId: string, mode?: 'force' | 'due') => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.runCronJob(jobId, mode)
    },
    [client],
  )

  const removeCronJob = useCallback(
    async (jobId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.removeCronJob(jobId)
    },
    [client],
  )

  const getCronJobRuns = useCallback(
    async (jobId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.getCronJobRuns(jobId)
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

  const getLogs = useCallback(
    async (params?: GatewayLogsParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.getLogs(params)
    },
    [client],
  )

  const spawnSubagent = useCallback(
    async (params: SessionsSpawnParams) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.spawnSubagent(params)
    },
    [client],
  )

  const listSubagents = useCallback(
    async (sessionKey?: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.listSubagents(sessionKey)
    },
    [client],
  )

  const stopSubagent = useCallback(
    async (runId: string) => {
      if (!client) {
        throw new Error('Client not connected')
      }
      return await client.stopSubagent(runId)
    },
    [client],
  )

  const onSubagentEvent = useCallback(
    (callback: (event: SubagentEvent) => void) => {
      if (!client) {
        return () => {}
      }
      return client.onSubagentEvent(callback)
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
    reconnecting,
    awaitingApproval,
    error,
    health,
    snapshot,
    connectResponse,
    connect,
    disconnect,
    retryConnection,
    refreshHealth,
    sendMessage,
    chatSend,
    chatAbort,
    sendAgentRequest,
    getChatHistory,
    resetSession,
    deleteSession,
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
    getLogs,
    spawnSubagent,
    listSubagents,
    stopSubagent,
    onSubagentEvent,
  }
}
