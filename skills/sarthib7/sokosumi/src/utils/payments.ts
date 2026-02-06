// Masumi payment integration for Sokosumi jobs (Advanced mode)

export interface MasumiPaymentConfig {
  serviceUrl: string
  adminApiKey: string
  network: 'Preprod' | 'Mainnet'
}

export interface MasumiPaymentRequest {
  agentIdentifier: string
  network: string
  identifierFromPurchaser: string
  inputData: Record<string, unknown>
}

export interface MasumiPaymentResponse {
  blockchainIdentifier: string
  payByTime: string
  onChainState: string
  inputHash: string
}

export interface MasumiPaymentStatusResponse {
  blockchainIdentifier: string
  onChainState: string
  network: string
  payByTime?: string
  resultHash?: string
  inputHash: string
}

export interface MasumiSubmitResultRequest {
  blockchainIdentifier: string
  network: string
  submitResultHash: string
}

export type MasumiPaymentState =
  | 'WaitingForExternalAction'
  | 'FundsLocked'
  | 'ResultSubmitted'
  | 'Withdrawn'
  | 'RefundWithdrawn'

export type MasumiError =
  | { type: 'service_unavailable'; message: string; cause?: unknown }
  | { type: 'unauthorized'; message: string }
  | { type: 'agent_not_found'; message: string }
  | { type: 'payment_failed'; message: string }
  | { type: 'network_error'; message: string; cause?: unknown }

const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds

/**
 * Masumi payment client for handling blockchain payments
 */
export class MasumiPaymentClient {
  private readonly serviceUrl: string
  private readonly adminApiKey: string
  private readonly network: 'Preprod' | 'Mainnet'
  private readonly timeout: number

  constructor(config: MasumiPaymentConfig & { timeout?: number }) {
    this.serviceUrl = config.serviceUrl.replace(/\/$/, '') // Remove trailing slash
    this.adminApiKey = config.adminApiKey
    this.network = config.network
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS
  }

  /**
   * Create a payment request for a job
   */
  async createPayment(
    request: Omit<MasumiPaymentRequest, 'network'>,
  ): Promise<{ ok: true; data: MasumiPaymentResponse } | { ok: false; error: MasumiError }> {
    const fullRequest: MasumiPaymentRequest = {
      ...request,
      network: this.network,
    }

    // Ensure base URL handling is consistent
    // If serviceUrl already includes /api/v1, don't add it again
    const paymentPath = this.serviceUrl.includes('/api/v1') ? '/payment' : '/api/v1/payment'

    const response = await this.request<MasumiPaymentResponse>({
      method: 'POST',
      path: paymentPath,
      body: fullRequest,
    })

    return response
  }

  /**
   * Check payment status
   * Uses POST /payment/resolve-blockchain-identifier endpoint (correct API endpoint)
   */
  async getPaymentStatus(
    blockchainIdentifier: string,
  ): Promise<{ ok: true; data: MasumiPaymentStatusResponse } | { ok: false; error: MasumiError }> {
    // Ensure base URL handling is consistent
    const resolvePath = this.serviceUrl.includes('/api/v1')
      ? '/payment/resolve-blockchain-identifier'
      : '/api/v1/payment/resolve-blockchain-identifier'

    const response = await this.request<MasumiPaymentStatusResponse>({
      method: 'POST',
      path: resolvePath,
      body: {
        blockchainIdentifier,
        network: this.network,
      },
    })

    return response
  }

  /**
   * Submit job result to unlock payment
   * Note: API expects submitResultHash (not resultHash)
   */
  async submitResult(
    request: Omit<MasumiSubmitResultRequest, 'network'>,
  ): Promise<{ ok: true; data: unknown } | { ok: false; error: MasumiError }> {
    const fullRequest: MasumiSubmitResultRequest = {
      ...request,
      network: this.network,
    }

    // Map resultHash to submitResultHash for API compatibility
    const apiRequest = {
      blockchainIdentifier: fullRequest.blockchainIdentifier,
      network: fullRequest.network,
      submitResultHash: fullRequest.submitResultHash,
    }

    // Ensure base URL handling is consistent
    const submitPath = this.serviceUrl.includes('/api/v1')
      ? '/payment/submit-result'
      : '/api/v1/payment/submit-result'

    const response = await this.request({
      method: 'POST',
      path: submitPath,
      body: apiRequest,
    })

    return response
  }

  /**
   * Wait for payment to be locked (polling)
   */
  async waitForPaymentLocked(
    blockchainIdentifier: string,
    options: {
      maxWaitMs?: number
      pollIntervalMs?: number
      onUpdate?: (state: MasumiPaymentState) => void
    } = {},
  ): Promise<
    | { ok: true; data: MasumiPaymentStatusResponse }
    | { ok: false; error: MasumiError | { type: 'timeout'; message: string } }
  > {
    const maxWaitMs = options.maxWaitMs || 300000 // 5 minutes default
    const pollIntervalMs = options.pollIntervalMs || 5000 // 5 seconds default
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const statusResult = await this.getPaymentStatus(blockchainIdentifier)

      if (!statusResult.ok) {
        return statusResult
      }

      const state = statusResult.data.onChainState as MasumiPaymentState

      if (options.onUpdate) {
        options.onUpdate(state)
      }

      if (state === 'FundsLocked') {
        return { ok: true, data: statusResult.data }
      }

      if (state === 'RefundWithdrawn') {
        return {
          ok: false,
          error: {
            type: 'payment_failed',
            message: 'Payment was refunded',
          },
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }

    return {
      ok: false,
      error: {
        type: 'timeout',
        message: `Payment not locked within ${maxWaitMs}ms`,
      },
    }
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(params: {
    method: 'GET' | 'POST'
    path: string
    body?: unknown
  }): Promise<{ ok: true; data: T } | { ok: false; error: MasumiError }> {
    const url = `${this.serviceUrl}${params.path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        token: this.adminApiKey,
      }

      if (params.body) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        method: params.method,
        headers,
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')

        switch (response.status) {
          case 401:
            return {
              ok: false,
              error: {
                type: 'unauthorized',
                message: 'Invalid Masumi admin API key. Check your configuration.',
              },
            }
          case 404:
            return {
              ok: false,
              error: {
                type: 'agent_not_found',
                message: 'Agent not found in Masumi registry',
              },
            }
          default:
            return {
              ok: false,
              error: {
                type: 'payment_failed',
                message: `Payment service error: ${errorText}`,
              },
            }
        }
      }

      const data = (await response.json()) as T
      return { ok: true, data }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          error: {
            type: 'network_error',
            message: `Request timeout after ${this.timeout}ms`,
            cause: error,
          },
        }
      }

      return {
        ok: false,
        error: {
          type: 'service_unavailable',
          message: `Cannot reach Masumi payment service at ${this.serviceUrl}`,
          cause: error,
        },
      }
    }
  }
}

/**
 * Create a Masumi payment client
 */
export function createMasumiPaymentClient(config: MasumiPaymentConfig): MasumiPaymentClient {
  return new MasumiPaymentClient(config)
}
