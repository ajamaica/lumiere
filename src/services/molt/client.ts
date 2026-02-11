import { clientConfig, protocolConfig } from '../../config/gateway.config'
import { logger } from '../../utils/logger'
import {
  AgentEvent,
  AgentParams,
  ConnectResponse,
  EventFrame,
  HealthStatus,
  MoltConfig,
  RequestFrame,
  ResponseFrame,
  SendMessageParams,
  Skill,
  SkillsListResponse,
  TeachSkillParams,
  UpdateSkillParams,
} from './types'

const wsLogger = logger.create('WebSocket')

type EventListener = (event: EventFrame) => void
type ResponseHandler = (response: ResponseFrame) => void
type ConnectionStateListener = (connected: boolean, reconnecting: boolean) => void

export class MoltGatewayClient {
  private ws: WebSocket | null = null
  private config: MoltConfig
  private connected = false
  private requestId = 0
  private responseHandlers = new Map<string, ResponseHandler>()
  private eventListeners: EventListener[] = []
  private connectionStateListeners: ConnectionStateListener[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnecting = false
  private reconnectExhausted = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: MoltConfig) {
    this.config = {
      clientId: 'lumiere-mobile',
      ...config,
    }
  }

  connect(): Promise<ConnectResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = () => {
          wsLogger.info('WebSocket connected')
          this.performHandshake()
            .then((response) => {
              this.connected = true
              this.reconnecting = false
              this.reconnectAttempts = 0
              this.notifyConnectionState()
              resolve(response)
            })
            .catch(reject)
        }

        this.ws.onmessage = (event) => {
          try {
            const frame = JSON.parse(event.data)
            this.handleFrame(frame)
          } catch (error) {
            wsLogger.logError('Failed to parse message', error)
          }
        }

        this.ws.onerror = (error) => {
          wsLogger.logError('WebSocket error', error)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          wsLogger.info('WebSocket closed')
          this.connected = false
          this.notifyConnectionState()
          this.handleReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async performHandshake(): Promise<ConnectResponse> {
    const params = {
      minProtocol: protocolConfig.minProtocol,
      maxProtocol: protocolConfig.maxProtocol,
      client: clientConfig,
      auth: {
        token: this.config.token,
      },
    }

    const response = await this.request('connect', params)
    return response as ConnectResponse
  }

  private handleFrame(frame: RequestFrame | ResponseFrame | EventFrame) {
    if (frame.type === 'res') {
      const handler = this.responseHandlers.get(frame.id)
      if (handler) {
        handler(frame)
        this.responseHandlers.delete(frame.id)
      }
    } else if (frame.type === 'event') {
      this.eventListeners.forEach((listener) => listener(frame))
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.reconnecting = true
      this.notifyConnectionState()
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      wsLogger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect().catch((error) => {
          wsLogger.logError('Reconnection failed', error)
          this.reconnecting = false
          this.notifyConnectionState()
        })
      }, delay)
    } else {
      wsLogger.error('Max reconnection attempts reached')
      this.reconnecting = false
      this.reconnectExhausted = true
      this.notifyConnectionState()
    }
  }

  /**
   * Manually retry connection after automatic reconnection has been exhausted.
   * This resets the attempt counter and initiates a new connection.
   */
  retryConnection(): Promise<ConnectResponse> {
    // Cancel any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Reset state for fresh connection attempt
    this.reconnectAttempts = 0
    this.reconnectExhausted = false
    this.reconnecting = false

    return this.connect()
  }

  /**
   * Check if automatic reconnection attempts have been exhausted.
   * When true, use retryConnection() to manually initiate a new connection.
   */
  isReconnectExhausted(): boolean {
    return this.reconnectExhausted
  }

  private notifyConnectionState() {
    this.connectionStateListeners.forEach((listener) => listener(this.connected, this.reconnecting))
  }

  onConnectionStateChange(listener: ConnectionStateListener) {
    this.connectionStateListeners.push(listener)
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter((l) => l !== listener)
    }
  }

  request(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const id = `req-${++this.requestId}`
      const frame: RequestFrame = {
        type: 'req',
        id,
        method,
        params,
      }

      this.responseHandlers.set(id, (response) => {
        if (response.ok) {
          resolve(response.payload)
        } else {
          reject(response.error)
        }
      })

      this.ws.send(JSON.stringify(frame))
    })
  }

  addEventListener(listener: EventListener) {
    this.eventListeners.push(listener)
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener)
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return (await this.request('health')) as HealthStatus
  }

  async getStatus(): Promise<unknown> {
    return await this.request('status')
  }

  async sendMessage(params: SendMessageParams): Promise<unknown> {
    return await this.request('send', params)
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<unknown> {
    return await this.request('chat.history', { sessionKey, limit })
  }

  async resetSession(sessionKey: string): Promise<unknown> {
    return await this.request('sessions.reset', { key: sessionKey })
  }

  async listSessions(): Promise<unknown> {
    return await this.request('sessions.list')
  }

  async getSchedulerStatus(): Promise<unknown> {
    return await this.request('cron.status')
  }

  async listCronJobs(): Promise<unknown> {
    return await this.request('cron.list')
  }

  async disableCronJob(jobId: string): Promise<unknown> {
    return await this.request('cron.update', { jobId, patch: { enabled: false } })
  }

  async enableCronJob(jobId: string): Promise<unknown> {
    return await this.request('cron.update', { jobId, patch: { enabled: true } })
  }

  async runCronJob(jobId: string, mode: 'force' | 'due' = 'force'): Promise<unknown> {
    return await this.request('cron.run', { jobId, mode })
  }

  async removeCronJob(jobId: string): Promise<unknown> {
    return await this.request('cron.remove', { jobId })
  }

  async getCronJobRuns(jobId: string): Promise<unknown> {
    return await this.request('cron.runs', { jobId })
  }

  async teachSkill(params: TeachSkillParams): Promise<Skill> {
    return (await this.request('skills.teach', params)) as Skill
  }

  async listSkills(): Promise<SkillsListResponse> {
    return (await this.request('skills.list')) as SkillsListResponse
  }

  async removeSkill(name: string): Promise<unknown> {
    return await this.request('skills.remove', { name })
  }

  async updateSkill(params: UpdateSkillParams): Promise<Skill> {
    return (await this.request('skills.update', params)) as Skill
  }

  async sendAgentRequest(
    params: AgentParams,
    onEvent?: (event: AgentEvent) => void,
  ): Promise<unknown> {
    if (onEvent) {
      let unsubscribe: (() => void) | null = null

      unsubscribe = this.addEventListener((frame) => {
        if (frame.event === 'agent') {
          const agentEvent = frame.payload as AgentEvent
          onEvent(agentEvent)

          // Unsubscribe after receiving the end event
          if (agentEvent.stream === 'lifecycle' && agentEvent.data.phase === 'end') {
            if (unsubscribe) {
              unsubscribe()
            }
          }
        }
      })

      return await this.request('agent', params)
    } else {
      return await this.request('agent', params)
    }
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  disconnect() {
    // Cancel any pending reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connected = false
      this.reconnecting = false
      this.reconnectExhausted = false
      this.reconnectAttempts = 0
    }
  }
}
