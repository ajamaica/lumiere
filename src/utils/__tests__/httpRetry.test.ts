import { fetchWithRetry, fetchWithTimeout } from '../httpRetry'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('fetchWithTimeout', () => {
  it('returns response when request succeeds within timeout', async () => {
    const mockResponse = new Response('ok', { status: 200 })
    mockFetch.mockResolvedValueOnce(mockResponse)

    const response = await fetchWithTimeout('https://api.example.com', undefined, 5000)

    expect(response).toBe(mockResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('aborts request when timeout is exceeded', async () => {
    mockFetch.mockImplementation(
      (_input: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }),
    )

    const promise = fetchWithTimeout('https://api.example.com', undefined, 100)

    // Advance timer past the timeout
    jest.advanceTimersByTime(150)

    await expect(promise).rejects.toThrow('Request timed out after 100ms')
  })

  it('passes through non-timeout errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(fetchWithTimeout('https://api.example.com', undefined, 5000)).rejects.toThrow(
      'Failed to fetch',
    )
  })
})

describe('fetchWithRetry', () => {
  it('returns response on first successful attempt', async () => {
    const mockResponse = new Response('ok', { status: 200 })
    mockFetch.mockResolvedValueOnce(mockResponse)

    const response = await fetchWithRetry('https://api.example.com', undefined, {
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseDelayMs: 100,
    })

    expect(response).toBe(mockResponse)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries on transient network error and succeeds', async () => {
    const mockResponse = new Response('ok', { status: 200 })
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockResponse)

    const promise = fetchWithRetry('https://api.example.com', undefined, {
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseDelayMs: 100,
    })

    // Advance past the retry delay
    await jest.advanceTimersByTimeAsync(200)

    const response = await promise
    expect(response).toBe(mockResponse)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on transient HTTP status (429) and succeeds', async () => {
    const rateLimited = new Response('rate limited', { status: 429 })
    const success = new Response('ok', { status: 200 })
    mockFetch.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success)

    const promise = fetchWithRetry('https://api.example.com', undefined, {
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseDelayMs: 100,
    })

    await jest.advanceTimersByTimeAsync(200)

    const response = await promise
    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns transient status response after exhausting retries', async () => {
    const rateLimited = new Response('rate limited', { status: 429 })
    mockFetch.mockResolvedValue(rateLimited)

    const promise = fetchWithRetry('https://api.example.com', undefined, {
      timeoutMs: 5000,
      maxRetries: 1,
      retryBaseDelayMs: 100,
    })

    // Advance past the retry delay
    await jest.advanceTimersByTimeAsync(200)

    const response = await promise
    expect(response.status).toBe(429)
    expect(mockFetch).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  it('does not retry on non-transient errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Invalid URL'))

    await expect(
      fetchWithRetry('https://api.example.com', undefined, {
        timeoutMs: 5000,
        maxRetries: 2,
        retryBaseDelayMs: 100,
      }),
    ).rejects.toThrow('Invalid URL')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry non-transient HTTP status codes', async () => {
    const unauthorized = new Response('unauthorized', { status: 401 })
    mockFetch.mockResolvedValueOnce(unauthorized)

    const response = await fetchWithRetry('https://api.example.com', undefined, {
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseDelayMs: 100,
    })

    expect(response.status).toBe(401)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
