import { HTTP_CONFIG } from '../constants'

/**
 * Determines whether an HTTP error is transient and worth retrying.
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors (DNS failure, connection refused, etc.)
    return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('network') || msg.includes('timeout') || msg.includes('aborted')
  }
  return false
}

/**
 * Determines whether an HTTP status code is transient.
 */
function isTransientStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a `fetch` request with a timeout.
 *
 * Uses `AbortController` so the request is properly cancelled on timeout.
 */
export async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs: number = HTTP_CONFIG.CONNECT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Execute a `fetch` request with timeout and automatic retries for transient
 * failures (network errors, 429, 502, 503, 504).
 *
 * Uses exponential backoff between retries.
 */
export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  options?: {
    timeoutMs?: number
    maxRetries?: number
    retryBaseDelayMs?: number
  },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? HTTP_CONFIG.CONNECT_TIMEOUT_MS
  const maxRetries = options?.maxRetries ?? HTTP_CONFIG.MAX_RETRIES
  const retryBaseDelayMs = options?.retryBaseDelayMs ?? HTTP_CONFIG.RETRY_BASE_DELAY_MS

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(input, init, timeoutMs)

      // If the response indicates a transient server issue and we have retries left, retry
      if (isTransientStatus(response.status) && attempt < maxRetries) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }

      return response
    } catch (error) {
      lastError = error

      if (attempt < maxRetries && isTransientError(error)) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }

      throw error
    }
  }

  // Should not reach here, but just in case
  throw lastError
}
