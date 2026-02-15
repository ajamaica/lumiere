import type {
  AuthResponse,
  InstanceResponse,
  SubscriptionResponse,
  ThinkLumiereApiError,
} from '../../store/thinklumiereTypes'
import { logger } from '../../utils/logger'

const log = logger.create('ThinkLumiereAPI')

const BASE_URL = 'https://thinklumiere.com/api/mobile'

export class ThinkLumiereApiClient {
  private sessionToken: string | null = null

  setSessionToken(token: string | null) {
    this.sessionToken = token
  }

  getSessionToken(): string | null {
    return this.sessionToken
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<{ data: T; status: number }> {
    const url = `${BASE_URL}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`
    }

    log.debug(`${options.method || 'GET'} ${path}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ThinkLumiereApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}`,
      }))
      log.error(`${options.method || 'GET'} ${path} failed: ${response.status}`, error.detail)
      const err = new ThinkLumiereApiRequestError(error.detail, response.status)
      throw err
    }

    const data = (await response.json()) as T
    return { data, status: response.status }
  }

  // ─── Auth ───────────────────────────────────────────────

  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const { data } = await this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    })
    return data
  }

  // ─── Subscription ──────────────────────────────────────

  async verifyAppleSubscription(
    params: { transactionId: string } | { receiptData: string },
  ): Promise<SubscriptionResponse> {
    const body =
      'transactionId' in params
        ? { transaction_id: params.transactionId }
        : { receipt_data: params.receiptData }

    const { data } = await this.request<SubscriptionResponse>('/subscription/apple/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return data
  }

  async getSubscriptionStatus(): Promise<SubscriptionResponse> {
    const { data } = await this.request<SubscriptionResponse>('/subscription/status')
    return data
  }

  // ─── Instances ─────────────────────────────────────────

  async createInstance(): Promise<InstanceResponse> {
    const { data } = await this.request<InstanceResponse>('/instances', {
      method: 'POST',
    })
    return data
  }

  async listInstances(): Promise<InstanceResponse[]> {
    const { data } = await this.request<InstanceResponse[]>('/instances')
    return data
  }

  async getInstance(instanceId: string): Promise<InstanceResponse> {
    const { data } = await this.request<InstanceResponse>(`/instances/${instanceId}`)
    return data
  }
}

export class ThinkLumiereApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'ThinkLumiereApiRequestError'
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401
  }

  get isForbidden(): boolean {
    return this.statusCode === 403
  }

  get isNotFound(): boolean {
    return this.statusCode === 404
  }
}

/** Singleton API client instance shared across hooks */
export const thinkLumiereApi = new ThinkLumiereApiClient()
