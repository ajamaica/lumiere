import { clientConfig, nodeConfig, protocolConfig } from '../../config/gateway.config'
import {
  AgentEvent,
  AgentParams,
  ConnectResponse,
  EventFrame,
  HealthStatus,
  MoltConfig,
  NodePairApproval,
  NodePairResponse,
  PairingState,
  RequestFrame,
  ResponseFrame,
  SendMessageParams,
} from './types'

type EventListener = (event: EventFrame) => void
type ResponseHandler = (response: ResponseFrame) => void
type ConnectionStateListener = (connected: boolean, reconnecting: boolean) => void
type PairingStateListener = (state: PairingState, info?: NodePairResponse) => void

export class MoltGatewayClient {
  private ws: WebSocket | null = null
  private config: MoltConfig
  private connected = false
  private requestId = 0
  private responseHandlers = new Map<string, ResponseHandler>()
  private eventListeners: EventListener[] = []
  private connectionStateListeners: ConnectionStateListener[] = []
  private pairingStateListeners: PairingStateListener[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnecting = false
  private _pairingState: PairingState = 'unpaired'
  private pairingInfo: NodePairResponse | null = null

  constructor(config: MoltConfig) {
    this.config = {
      clientId: 'lumiere-mobile',
      ...config,
    }
  }

  get pairingState(): PairingState {
    return this._pairingState
  }

  connect(): Promise<ConnectResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
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
            console.error('Failed to parse message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          console.log('WebSocket closed')
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
    const params: Record<string, unknown> = {
      minProtocol: protocolConfig.minProtocol,
      maxProtocol: protocolConfig.maxProtocol,
      client: clientConfig,
      role: 'node',
      device: {
        id: this.config.clientId || clientConfig.id,
        name: nodeConfig.defaultName,
      },
      caps: nodeConfig.caps,
    }

    // Include auth token if we have one (paired nodes reconnecting)
    if (this.config.token) {
      params.auth = { token: this.config.token }
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
      // Handle pairing events internally
      if (frame.event === 'node.pair.approved') {
        const approval = frame.payload as NodePairApproval
        this.setPairingState('paired')
        this.pairingStateListeners.forEach((l) => l('paired', this.pairingInfo ?? undefined))
        // The approval contains the token — callers should listen for this
        this.eventListeners.forEach((listener) => listener(frame))
        console.log('Node pairing approved, token received for node:', approval.nodeId)
      } else if (frame.event === 'node.pair.rejected') {
        this.setPairingState('unpaired')
        this.pairingInfo = null
        this.eventListeners.forEach((listener) => listener(frame))
        console.log('Node pairing rejected')
      } else {
        this.eventListeners.forEach((listener) => listener(frame))
      }
    }
  }

  private setPairingState(state: PairingState) {
    this._pairingState = state
    this.pairingStateListeners.forEach((l) => l(state, this.pairingInfo ?? undefined))
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.reconnecting = true
      this.notifyConnectionState()
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
          this.reconnecting = false
          this.notifyConnectionState()
        })
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
      this.reconnecting = false
      this.notifyConnectionState()
    }
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

  onPairingStateChange(listener: PairingStateListener) {
    this.pairingStateListeners.push(listener)
    return () => {
      this.pairingStateListeners = this.pairingStateListeners.filter((l) => l !== listener)
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

  // --- Node pairing methods ---

  async requestPairing(name?: string): Promise<NodePairResponse> {
    this.setPairingState('requesting')

    try {
      const response = (await this.request('node.pair.request', {
        nodeId: this.config.clientId || clientConfig.id,
        name: name || nodeConfig.defaultName,
        caps: nodeConfig.caps,
      })) as NodePairResponse

      this.pairingInfo = response
      this.setPairingState('waiting')

      return response
    } catch (error) {
      this.setPairingState('error')
      throw error
    }
  }

  async verifyPairing(nodeId: string, token: string): Promise<boolean> {
    try {
      const response = (await this.request('node.pair.verify', {
        nodeId,
        token,
      })) as { valid: boolean }
      return response.valid
    } catch {
      return false
    }
  }

  getPairingInfo(): NodePairResponse | null {
    return this.pairingInfo
  }

  // --- Standard gateway methods ---

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

  async disableCronJob(jobName: string): Promise<unknown> {
    return await this.request('cron.update', { name: jobName, enabled: false })
  }

  async enableCronJob(jobName: string): Promise<unknown> {
    return await this.request('cron.update', { name: jobName, enabled: true })
  }

  async runCronJob(jobName: string): Promise<unknown> {
    return await this.request('cron.run', { name: jobName })
  }

  async removeCronJob(jobName: string): Promise<unknown> {
    return await this.request('cron.remove', { name: jobName })
  }

  async getCronJobRuns(jobName: string): Promise<unknown> {
    return await this.request('cron.runs', { name: jobName })
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
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.connected = false
    }
  }
}
