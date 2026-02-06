// Sokosumi API client for OpenClaw

import type {
  SokosumiAgent,
  SokosumiClientConfig,
  SokosumiCreateJobRequest,
  SokosumiCreateJobResponse,
  SokosumiError,
  SokosumiInputSchemaResponse,
  SokosumiJob,
  SokosumiJobResponse,
  SokosumiListAgentsResponse,
} from '../types'

const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds
const DEFAULT_API_ENDPOINT = 'https://api.sokosumi.com/v1'

export class SokosumiClient {
  private readonly apiEndpoint: string
  private readonly apiKey: string
  private readonly timeout: number

  constructor(config: SokosumiClientConfig) {
    this.apiEndpoint = config.apiEndpoint || DEFAULT_API_ENDPOINT
    this.apiKey = config.apiKey
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS
  }

  /**
   * List all available agents on Sokosumi marketplace
   */
  async listAgents(): Promise<
    { ok: true; data: SokosumiAgent[] } | { ok: false; error: SokosumiError }
  > {
    try {
      const response = await this.request<SokosumiListAgentsResponse>({
        method: 'GET',
        path: '/agents',
      })

      if (response.ok === false) {
        return response
      }

      // TypeScript now knows response.ok is true
      const responseData = response.data
      return { ok: true, data: responseData.data }
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'network_error',
          message: 'Failed to list agents',
          cause: error,
        },
      }
    }
  }

  /**
   * Get agent input schema
   */
  async getAgentInputSchema(
    agentId: string,
  ): Promise<
    { ok: true; data: SokosumiInputSchemaResponse['data'] } | { ok: false; error: SokosumiError }
  > {
    try {
      const response = await this.request<SokosumiInputSchemaResponse>({
        method: 'GET',
        path: `/agents/${encodeURIComponent(agentId)}/input-schema`,
      })

      if (response.ok === false) {
        return response
      }

      const responseData = response.data
      return { ok: true, data: responseData.data }
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'network_error',
          message: 'Failed to get agent input schema',
          cause: error,
        },
      }
    }
  }

  /**
   * Create a new job for an agent
   */
  async createJob(
    agentId: string,
    request: SokosumiCreateJobRequest,
  ): Promise<{ ok: true; data: SokosumiJob } | { ok: false; error: SokosumiError }> {
    try {
      const response = await this.request<SokosumiCreateJobResponse>({
        method: 'POST',
        path: `/agents/${encodeURIComponent(agentId)}/jobs`,
        body: request,
      })

      if (response.ok === false) {
        return response
      }

      const responseData = response.data
      return { ok: true, data: responseData.data }
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'network_error',
          message: 'Failed to create job',
          cause: error,
        },
      }
    }
  }

  /**
   * Get job status
   */
  async getJob(
    jobId: string,
  ): Promise<{ ok: true; data: SokosumiJob } | { ok: false; error: SokosumiError }> {
    try {
      const response = await this.request<SokosumiJobResponse>({
        method: 'GET',
        path: `/jobs/${encodeURIComponent(jobId)}`,
      })

      if (response.ok === false) {
        return response
      }

      const responseData = response.data
      return { ok: true, data: responseData.data }
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'network_error',
          message: 'Failed to get job status',
          cause: error,
        },
      }
    }
  }

  /**
   * List all jobs for an agent
   */
  async listJobs(
    agentId: string,
  ): Promise<{ ok: true; data: SokosumiJob[] } | { ok: false; error: SokosumiError }> {
    try {
      const response = await this.request<{ data: SokosumiJob[] }>({
        method: 'GET',
        path: `/agents/${encodeURIComponent(agentId)}/jobs`,
      })

      if (response.ok === false) {
        return response
      }

      const responseData = response.data
      return { ok: true, data: responseData.data }
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'network_error',
          message: 'Failed to list jobs',
          cause: error,
        },
      }
    }
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(params: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    body?: unknown
  }): Promise<{ ok: true; data: T } | { ok: false; error: SokosumiError }> {
    const url = `${this.apiEndpoint}${params.path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
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

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')

        switch (response.status) {
          case 401:
            return {
              ok: false,
              error: {
                type: 'unauthorized',
                message: 'Invalid Sokosumi API key. Check your configuration.',
              },
            }
          case 404:
            return {
              ok: false,
              error: {
                type: 'not_found',
                message: `Resource not found: ${params.path}`,
              },
            }
          case 402:
          case 403:
            return {
              ok: false,
              error: {
                type: 'insufficient_balance',
                message: 'Insufficient balance or credits. Please add funds to your account.',
              },
            }
          case 400:
            return {
              ok: false,
              error: {
                type: 'invalid_input',
                message: `Invalid input: ${errorText}`,
              },
            }
          default:
            return {
              ok: false,
              error: {
                type: 'api_error',
                message: `API error: ${errorText}`,
                statusCode: response.status,
              },
            }
        }
      }

      // Parse JSON response
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
          type: 'network_error',
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error,
        },
      }
    }
  }
}

/**
 * Create a Sokosumi client with the given configuration
 */
export function createSokosumiClient(config: SokosumiClientConfig): SokosumiClient {
  return new SokosumiClient(config)
}
