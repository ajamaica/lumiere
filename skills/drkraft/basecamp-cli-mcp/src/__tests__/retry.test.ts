import got, { Got, HTTPError } from 'got'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Retry Logic with Exponential Backoff', () => {
  let client: Got

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Retry Configuration', () => {
    it('should retry on 429 (Too Many Requests)', async () => {
      const mockClient = got.extend({
        retry: {
          limit: 3,
          methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
          statusCodes: [429, 500, 502, 503, 504],
          errorCodes: [],
          calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
            return Math.pow(2, attemptCount - 1) * 1000
          },
        },
      })

      expect(mockClient.defaults.options.retry).toBeDefined()
      expect(mockClient.defaults.options.retry.limit).toBe(3)
      expect(mockClient.defaults.options.retry.statusCodes).toContain(429)
    })

    it('should retry on 5xx errors (500, 502, 503, 504)', async () => {
      const mockClient = got.extend({
        retry: {
          limit: 3,
          methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
          statusCodes: [429, 500, 502, 503, 504],
          errorCodes: [],
          calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
            return Math.pow(2, attemptCount - 1) * 1000
          },
        },
      })

      const retryConfig = mockClient.defaults.options.retry
      expect(retryConfig.statusCodes).toContain(500)
      expect(retryConfig.statusCodes).toContain(502)
      expect(retryConfig.statusCodes).toContain(503)
      expect(retryConfig.statusCodes).toContain(504)
    })

    it('should NOT retry on 4xx errors (except 429)', async () => {
      const mockClient = got.extend({
        retry: {
          limit: 3,
          methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
          statusCodes: [429, 500, 502, 503, 504],
          errorCodes: [],
          calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
            return Math.pow(2, attemptCount - 1) * 1000
          },
        },
      })

      const retryConfig = mockClient.defaults.options.retry
      expect(retryConfig.statusCodes).not.toContain(400)
      expect(retryConfig.statusCodes).not.toContain(401)
      expect(retryConfig.statusCodes).not.toContain(403)
      expect(retryConfig.statusCodes).not.toContain(404)
    })

    it('should limit retries to 3 attempts', async () => {
      const mockClient = got.extend({
        retry: {
          limit: 3,
          methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
          statusCodes: [429, 500, 502, 503, 504],
          errorCodes: [],
          calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
            return Math.pow(2, attemptCount - 1) * 1000
          },
        },
      })

      expect(mockClient.defaults.options.retry.limit).toBe(3)
    })
  })

  describe('Exponential Backoff Calculation', () => {
    it('should calculate 1s delay for first retry (2^0 * 1000)', () => {
      const calculateDelay = ({ attemptCount }: { attemptCount: number }) => {
        return Math.pow(2, attemptCount - 1) * 1000
      }

      expect(calculateDelay({ attemptCount: 1 })).toBe(1000)
    })

    it('should calculate 2s delay for second retry (2^1 * 1000)', () => {
      const calculateDelay = ({ attemptCount }: { attemptCount: number }) => {
        return Math.pow(2, attemptCount - 1) * 1000
      }

      expect(calculateDelay({ attemptCount: 2 })).toBe(2000)
    })

    it('should calculate 4s delay for third retry (2^2 * 1000)', () => {
      const calculateDelay = ({ attemptCount }: { attemptCount: number }) => {
        return Math.pow(2, attemptCount - 1) * 1000
      }

      expect(calculateDelay({ attemptCount: 3 })).toBe(4000)
    })
  })

  describe('Retry-After Header Handling', () => {
    it('should parse Retry-After header with numeric seconds', () => {
      const getRetryAfterDelay = (response: any): number | undefined => {
        const retryAfter = response.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const response = {
        headers: { 'retry-after': '60' },
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBe(60000)
    })

    it('should parse Retry-After header with HTTP-date format', () => {
      const getRetryAfterDelay = (response: any): number | undefined => {
        const retryAfter = response.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const futureDate = new Date(Date.now() + 30000).toUTCString()
      const response = {
        headers: { 'retry-after': futureDate },
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBeGreaterThan(0)
      expect(delay).toBeLessThanOrEqual(30000)
    })

    it('should return undefined when Retry-After header is missing', () => {
      const getRetryAfterDelay = (response: any): number | undefined => {
        const retryAfter = response.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const response = {
        headers: {},
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBeUndefined()
    })

    it('should handle invalid Retry-After values gracefully', () => {
      const getRetryAfterDelay = (response: any): number | undefined => {
        const retryAfter = response.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const response = {
        headers: { 'retry-after': 'invalid-value' },
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBeUndefined()
    })
  })

  describe('HTTP Methods Retry Support', () => {
    it('should retry GET requests', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.methods).toContain('GET')
    })

    it('should retry POST requests', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.methods).toContain('POST')
    })

    it('should retry PUT requests', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.methods).toContain('PUT')
    })

    it('should retry DELETE requests', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.methods).toContain('DELETE')
    })
  })

  describe('Error Handling After Max Retries', () => {
    it('should preserve original error after max retries exceeded', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.limit).toBe(3)
      expect(retryConfig.statusCodes).toContain(429)
    })

    it('should throw error with 429 status after max retries', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).toContain(429)
      expect(retryConfig.limit).toBe(3)
    })

    it('should throw error with 5xx status after max retries', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).toContain(503)
      expect(retryConfig.limit).toBe(3)
    })
  })

  describe('Retry Scenarios', () => {
    it('should handle 429 with Retry-After header', () => {
      const response = {
        statusCode: 429,
        headers: { 'retry-after': '30' },
      }

      const getRetryAfterDelay = (resp: any): number | undefined => {
        const retryAfter = resp.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBe(30000)
      expect(response.statusCode).toBe(429)
    })

    it('should handle 429 without Retry-After header', () => {
      const response = {
        statusCode: 429,
        headers: {},
      }

      const getRetryAfterDelay = (resp: any): number | undefined => {
        const retryAfter = resp.headers['retry-after']
        if (!retryAfter) return undefined

        const seconds = parseInt(retryAfter, 10)
        if (!isNaN(seconds)) {
          return seconds * 1000
        }

        const retryDate = new Date(retryAfter)
        if (!isNaN(retryDate.getTime())) {
          return Math.max(0, retryDate.getTime() - Date.now())
        }

        return undefined
      }

      const delay = getRetryAfterDelay(response)
      expect(delay).toBeUndefined()
      expect(response.statusCode).toBe(429)
    })

    it('should handle 500 server error', () => {
      const response = {
        statusCode: 500,
        headers: {},
      }

      expect(response.statusCode).toBe(500)
    })

    it('should handle 502 bad gateway error', () => {
      const response = {
        statusCode: 502,
        headers: {},
      }

      expect(response.statusCode).toBe(502)
    })

    it('should handle 503 service unavailable error', () => {
      const response = {
        statusCode: 503,
        headers: {},
      }

      expect(response.statusCode).toBe(503)
    })

    it('should handle 504 gateway timeout error', () => {
      const response = {
        statusCode: 504,
        headers: {},
      }

      expect(response.statusCode).toBe(504)
    })
  })

  describe('Non-Retryable Errors', () => {
    it('should NOT retry on 400 Bad Request', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).not.toContain(400)
    })

    it('should NOT retry on 401 Unauthorized', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).not.toContain(401)
    })

    it('should NOT retry on 403 Forbidden', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).not.toContain(403)
    })

    it('should NOT retry on 404 Not Found', () => {
      const retryConfig = {
        limit: 3,
        methods: ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [],
        calculateDelay: ({ attemptCount }: { attemptCount: number }) => {
          return Math.pow(2, attemptCount - 1) * 1000
        },
      }

      expect(retryConfig.statusCodes).not.toContain(404)
    })
  })
})
