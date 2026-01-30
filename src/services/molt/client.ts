import { clientConfig,protocolConfig } from '../../config/gateway.config'
import {
  AgentEvent,
  AgentParams,
  ConnectParams,
  ConnectResponse,
  EventFrame,
  GatewayError,
  HealthStatus,
  MoltConfig,
  RequestFrame,
  ResponseFrame,
  SendMessageParams,
} from './types'

type EventListener = (event: EventFrame) => void
type ResponseHandler = (response: ResponseFrame) => void

export class MoltGatewayClient {
  private ws: WebSocket | null = null
  private config: MoltConfig
  private connected = false
  private requestId = 0
  private responseHandlers = new Map<string, ResponseHandler>()
  private eventListeners: EventListener[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

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
          console.log('WebSocket connected')
          this.performHandshake()
            .then((response) => {
              this.connected = true
              this.reconnectAttempts = 0
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
          this.handleReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async performHandshake(): Promise<ConnectResponse> {
    const params: any = {
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
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
        })
      }, delay)
    } else {
      console.error('Max reconnection attempts reached')
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
