import fetch from 'node-fetch'

/**
 * API client options
 */
export interface ApiClientOptions {
  baseUrl: string
  apiKey?: string
  additionalHeaders?: Record<string, string>
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Generic API client for Masumi services
 */
export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      ...(options.apiKey && { token: options.apiKey }),
      ...options.additionalHeaders,
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value)
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `API GET request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      )
    }

    const data = await response.json()
    return (data as any).data || data
  }

  /**
   * POST request
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `API POST request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      )
    }

    const data = await response.json()
    return (data as any).data || data
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `API PUT request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      )
    }

    const data = await response.json()
    return (data as any).data || data
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `API PATCH request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      )
    }

    const data = await response.json()
    return (data as any).data || data
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: this.headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `API DELETE request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText,
      )
    }

    const data = await response.json()
    return (data as any).data || data
  }

  /**
   * Update headers (useful for adding authentication after initialization)
   */
  updateHeaders(newHeaders: Record<string, string>): void {
    this.headers = { ...this.headers, ...newHeaders }
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error
      }

      // Last attempt - throw error
      if (attempt === maxRetries - 1) {
        throw lastError
      }

      // Wait with exponential backoff
      const delay = initialDelayMs * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
