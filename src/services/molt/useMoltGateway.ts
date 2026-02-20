import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { logger } from '../../utils/logger'
import { MoltGatewayClient } from './client'
import {
  AgentEvent,
  AgentParams,
  ChatAttachmentPayload,
  ChatSendResponse,
  ConfigGetResponse,
  ConfigPatchParams,
  ConnectionState,
  ConnectResponse,
  CronJobDetail,
  GatewayLogsParams,
  GatewayLogsResponse,
  GatewaySnapshot,
  HealthStatus,
  MoltConfig,
  PushRegisterParams,
  PushRegisterResult,
  PushTestParams,
  PushTestResult,
  SendMessageParams,
  SessionsSpawnParams,
  SessionsSpawnResponse,
  Skill,
  SkillsListResponse,
  SkillsStatusResponse,
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
  enableSkill: (name: string) => Promise<Skill>
  disableSkill: (name: string) => Promise<Skill>
  getLogs: (params?: GatewayLogsParams) => Promise<GatewayLogsResponse>
  spawnSubagent: (params: SessionsSpawnParams) => Promise<SessionsSpawnResponse>
  listSubagents: (sessionKey?: string) => Promise<SubagentsListResponse>
  stopSubagent: (runId: string) => Promise<void>
  onSubagentEvent: (callback: (event: SubagentEvent) => void) => () => void
  getServerConfig: () => Promise<ConfigGetResponse>
  patchServerConfig: (params: ConfigPatchParams) => Promise<unknown>
  getSkillsStatus: () => Promise<SkillsStatusResponse>
  getCronJobDetail: (jobId: string) => Promise<CronJobDetail | null>
  registerPushToken: (params: PushRegisterParams) => Promise<PushRegisterResult>
  testPushNotification: (params: PushTestParams) => Promise<PushTestResult>
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

/**
 * Require a connected client, throwing a descriptive error if null.
 * Used as a guard before every RPC call.
 */
function requireClient(client: MoltGatewayClient | null): MoltGatewayClient {
  if (!client) throw new Error('Client not connected')
  return client
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
      clientRef.current.destroy()
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
    const healthStatus = await requireClient(client).getHealth()
    setHealth(healthStatus)
  }, [client])

  // Derive all RPC method wrappers from the current client instance.
  // Each wrapper guards against a null client then delegates directly.
  const rpcMethods = useMemo(
    () => ({
      sendMessage: (params: SendMessageParams) => requireClient(client).sendMessage(params),
      chatSend: (
        sessionKey: string,
        message: string,
        options?: {
          thinking?: string
          attachments?: ChatAttachmentPayload[]
          idempotencyKey?: string
          timeoutMs?: number
        },
      ) => requireClient(client).chatSend(sessionKey, message, options),
      chatAbort: (sessionKey: string, runId: string) =>
        requireClient(client).chatAbort(sessionKey, runId),
      sendAgentRequest: (params: AgentParams, onEvent?: (event: AgentEvent) => void) =>
        requireClient(client).sendAgentRequest(params, onEvent),
      getChatHistory: (sessionKey: string, limit?: number) =>
        requireClient(client).getChatHistory(sessionKey, limit),
      resetSession: (sessionKey: string) => requireClient(client).resetSession(sessionKey),
      deleteSession: (sessionKey: string) => requireClient(client).deleteSession(sessionKey),
      listSessions: () => requireClient(client).listSessions(),
      getSchedulerStatus: () => requireClient(client).getSchedulerStatus(),
      listCronJobs: () => requireClient(client).listCronJobs(),
      disableCronJob: (jobId: string) => requireClient(client).disableCronJob(jobId),
      enableCronJob: (jobId: string) => requireClient(client).enableCronJob(jobId),
      runCronJob: (jobId: string, mode?: 'force' | 'due') =>
        requireClient(client).runCronJob(jobId, mode),
      removeCronJob: (jobId: string) => requireClient(client).removeCronJob(jobId),
      getCronJobRuns: (jobId: string) => requireClient(client).getCronJobRuns(jobId),
      teachSkill: (params: TeachSkillParams) => requireClient(client).teachSkill(params),
      listSkills: () => requireClient(client).listSkills(),
      removeSkill: (name: string) => requireClient(client).removeSkill(name),
      updateSkill: (params: UpdateSkillParams) => requireClient(client).updateSkill(params),
      enableSkill: (name: string) => requireClient(client).enableSkill(name),
      disableSkill: (name: string) => requireClient(client).disableSkill(name),
      getLogs: (params?: GatewayLogsParams) => requireClient(client).getLogs(params),
      spawnSubagent: (params: SessionsSpawnParams) => requireClient(client).spawnSubagent(params),
      listSubagents: (sessionKey?: string) => requireClient(client).listSubagents(sessionKey),
      stopSubagent: (runId: string) => requireClient(client).stopSubagent(runId),
      onSubagentEvent: (callback: (event: SubagentEvent) => void) =>
        client ? client.onSubagentEvent(callback) : () => {},
      getServerConfig: () => requireClient(client).getServerConfig(),
      patchServerConfig: (params: ConfigPatchParams) =>
        requireClient(client).patchServerConfig(params),
      getSkillsStatus: () => requireClient(client).getSkillsStatus(),
      getCronJobDetail: (jobId: string) => requireClient(client).getCronJobDetail(jobId),
      registerPushToken: (params: PushRegisterParams) =>
        requireClient(client).registerPushToken(params),
      testPushNotification: (params: PushTestParams) =>
        requireClient(client).testPushNotification(params),
    }),
    [client],
  )

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.destroy()
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
    ...rpcMethods,
  }
}
