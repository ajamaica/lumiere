import {
  MoltConfig,
  RequestFrame,
  ResponseFrame,
  EventFrame,
  ConnectParams,
  ConnectResponse,
  HealthStatus,
  SendMessageParams,
  AgentParams,
  AgentEvent,
  GatewayError,
  MIN_PROTOCOL,
  MAX_PROTOCOL,
} from './types';

type EventListener = (event: EventFrame) => void;
type ResponseHandler = (response: ResponseFrame) => void;

export class MoltGatewayClient {
  private ws: WebSocket | null = null;
  private config: MoltConfig;
  private connected = false;
  private requestId = 0;
  private responseHandlers = new Map<string, ResponseHandler>();
  private eventListeners: EventListener[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: MoltConfig) {
    this.config = {
      clientId: 'lumiere-mobile',
      ...config,
    };
  }

  connect(): Promise<ConnectResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.performHandshake()
            .then((response) => {
              this.connected = true;
              this.reconnectAttempts = 0;
              resolve(response);
            })
            .catch(reject);
        };

        this.ws.onmessage = (event) => {
          try {
            const frame = JSON.parse(event.data);
            this.handleFrame(frame);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.connected = false;
          this.handleReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async performHandshake(): Promise<ConnectResponse> {
    const params: any = {
      minProtocol: MIN_PROTOCOL,
      maxProtocol: MAX_PROTOCOL,
      client: {
        id: 'agent:main:main',
        mode: 'standalone',
        version: '1.0.0',
        platform: 'ios',
      },
      auth: {
        token: this.config.token,
      },
    };

    const response = await this.request('connect', params);
    return response as ConnectResponse;
  }

  private handleFrame(frame: RequestFrame | ResponseFrame | EventFrame) {
    if (frame.type === 'res') {
      const handler = this.responseHandlers.get(frame.id);
      if (handler) {
        handler(frame);
        this.responseHandlers.delete(frame.id);
      }
    } else if (frame.type === 'event') {
      this.eventListeners.forEach((listener) => listener(frame));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  request(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = `req-${++this.requestId}`;
      const frame: RequestFrame = {
        type: 'req',
        id,
        method,
        params,
      };

      this.responseHandlers.set(id, (response) => {
        if (response.ok) {
          resolve(response.payload);
        } else {
          reject(response.error);
        }
      });

      this.ws.send(JSON.stringify(frame));
    });
  }

  addEventListener(listener: EventListener) {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  async getHealth(): Promise<HealthStatus> {
    return (await this.request('health')) as HealthStatus;
  }

  async getStatus(): Promise<unknown> {
    return await this.request('status');
  }

  async sendMessage(params: SendMessageParams): Promise<unknown> {
    return await this.request('send', params);
  }

  async sendAgentRequest(
    params: AgentParams,
    onEvent?: (event: AgentEvent) => void
  ): Promise<unknown> {
    if (onEvent) {
      const unsubscribe = this.addEventListener((frame) => {
        if (frame.event === 'agent') {
          onEvent(frame.payload as AgentEvent);
        }
      });

      try {
        const result = await this.request('agent', params);
        return result;
      } finally {
        unsubscribe();
      }
    } else {
      return await this.request('agent', params);
    }
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}
