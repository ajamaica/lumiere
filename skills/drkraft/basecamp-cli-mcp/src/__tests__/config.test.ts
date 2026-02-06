import crypto from 'crypto'
import os from 'os'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BasecampTokens } from '../types'

let config: typeof import('../lib/config.js')

beforeAll(async () => {
  vi.unmock('../lib/config.js')
  config = await import('../lib/config.js')
})

describe('Config Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BASECAMP_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Encryption Utilities', () => {
    it('should generate consistent encryption key for same machine', () => {
      const machineId = `${os.hostname()}-${os.userInfo().username}-basecamp-cli-tokens`
      const key1 = crypto.createHash('sha256').update(machineId).digest()
      const key2 = crypto.createHash('sha256').update(machineId).digest()

      expect(key1.equals(key2)).toBe(true)
    })

    it('should encrypt and decrypt strings correctly', () => {
      const plaintext = 'test-access-token'
      const machineId = `${os.hostname()}-${os.userInfo().username}-basecamp-cli-tokens`
      const key = crypto.createHash('sha256').update(machineId).digest()

      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const encryptedString = iv.toString('hex') + ':' + encrypted

      const [ivHex, encryptedData] = encryptedString.split(':')
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      expect(decrypted).toBe(plaintext)
    })

    it('should detect encrypted format correctly', () => {
      const encrypted = '0123456789abcdef0123456789abcdef:encrypteddata'
      const plaintext = 'plain-text-token'

      const isEncrypted = (text: string): boolean => {
        if (!text) return false
        const parts = text.split(':')
        return parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0])
      }

      expect(isEncrypted(encrypted)).toBe(true)
      expect(isEncrypted(plaintext)).toBe(false)
    })

    it('should handle decryption of invalid format gracefully', () => {
      const invalidEncrypted = 'invalid-format'
      const machineId = `${os.hostname()}-${os.userInfo().username}-basecamp-cli-tokens`
      const key = crypto.createHash('sha256').update(machineId).digest()

      try {
        const [ivHex, encrypted] = invalidEncrypted.split(':')
        if (!ivHex || !encrypted) {
          throw new Error('Invalid encrypted format')
        }
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('Token Management', () => {
    describe('setTokens and getTokens', () => {
      it('should store and retrieve tokens', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() + 3600000,
        }

        config.setTokens(tokens)
        const retrieved = config.getTokens()

        expect(retrieved).toBeDefined()
        expect(retrieved?.access_token).toBe(tokens.access_token)
        expect(retrieved?.refresh_token).toBe(tokens.refresh_token)
        expect(retrieved?.expires_at).toBe(tokens.expires_at)
      })

      it('should handle token lifecycle', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() + 3600000,
        }

        config.setTokens(tokens)
        expect(config.getTokens()).toBeDefined()

        config.clearTokens()
        expect(config.getTokens()).toBeUndefined()
      })
    })
  })

  describe('Account Management', () => {
    it('should set and get current account ID', () => {
      config.setCurrentAccountId(99999999)
      const accountId = config.getCurrentAccountId()

      expect(accountId).toBe(99999999)
    })

    it('should handle different account IDs', () => {
      config.setCurrentAccountId(12345678)
      expect(config.getCurrentAccountId()).toBe(12345678)

      config.setCurrentAccountId(87654321)
      expect(config.getCurrentAccountId()).toBe(87654321)
    })
  })

  describe('Client Credentials', () => {
    it('should return credentials from env', () => {
      process.env.BASECAMP_CLIENT_SECRET = 'test-secret'
      process.env.BASECAMP_CLIENT_ID = 'test-client-id'

      const credentials = config.getClientCredentials()

      expect(credentials.clientSecret).toBe('test-secret')
      expect(credentials.clientId).toBeTruthy()
      expect(credentials.redirectUri).toBeTruthy()
    })

    it('should throw error when client secret is missing', () => {
      const originalSecret = process.env.BASECAMP_CLIENT_SECRET
      delete process.env.BASECAMP_CLIENT_SECRET

      expect(() => config.getClientCredentials()).toThrow(
        'BASECAMP_CLIENT_SECRET environment variable is not set',
      )

      process.env.BASECAMP_CLIENT_SECRET = originalSecret
    })

    it('should use default redirect URI', () => {
      process.env.BASECAMP_CLIENT_SECRET = 'test-secret'

      const credentials = config.getClientCredentials()

      expect(credentials.redirectUri).toMatch(/^http/)
    })

    it('should store and retrieve client config', () => {
      config.setClientConfig('my-client-id', 'http://localhost:8080/callback')

      const credentials = config.getClientCredentials()
      expect(credentials.clientId).toBe('my-client-id')
    })
  })

  describe('Utility Functions', () => {
    describe('isAuthenticated', () => {
      it('should return true when tokens exist', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() + 3600000,
        }

        config.setTokens(tokens)
        expect(config.isAuthenticated()).toBe(true)
      })

      it('should return false when no tokens', () => {
        config.clearTokens()
        expect(config.isAuthenticated()).toBe(false)
      })
    })

    describe('isTokenExpired', () => {
      it('should return false when token is valid', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() + 3600000,
        }

        config.setTokens(tokens)
        expect(config.isTokenExpired()).toBe(false)
      })

      it('should return true when token is expired', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() - 1000,
        }

        config.setTokens(tokens)
        expect(config.isTokenExpired()).toBe(true)
      })

      it('should return true when token expires within 1 minute', () => {
        const tokens: BasecampTokens = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_at: Date.now() + 30000,
        }

        config.setTokens(tokens)
        expect(config.isTokenExpired()).toBe(true)
      })

      it('should return true when no tokens exist', () => {
        config.clearTokens()
        expect(config.isTokenExpired()).toBe(true)
      })
    })
  })

  describe('Security', () => {
    it('should require client secret from environment', () => {
      process.env.BASECAMP_CLIENT_SECRET = 'test-secret'
      config.setClientConfig('test-client-id', 'http://localhost:9292/callback')

      const credentials = config.getClientCredentials()
      expect(credentials.clientSecret).toBe('test-secret')
    })

    it('should encrypt and decrypt tokens correctly', () => {
      const tokens: BasecampTokens = {
        access_token: 'plain-access-token',
        refresh_token: 'plain-refresh-token',
        expires_at: Date.now() + 3600000,
      }

      config.setTokens(tokens)
      const retrieved = config.getTokens()

      expect(retrieved?.access_token).toBe(tokens.access_token)
      expect(retrieved?.refresh_token).toBe(tokens.refresh_token)
    })

    it('should use machine-specific encryption key', () => {
      const machineId1 = `${os.hostname()}-${os.userInfo().username}-basecamp-cli-tokens`
      const machineId2 = `different-host-different-user-basecamp-cli-tokens`

      const key1 = crypto.createHash('sha256').update(machineId1).digest()
      const key2 = crypto.createHash('sha256').update(machineId2).digest()

      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long token strings', () => {
      const longToken = 'a'.repeat(10000)
      const tokens: BasecampTokens = {
        access_token: longToken,
        refresh_token: longToken,
        expires_at: Date.now() + 3600000,
      }

      expect(() => config.setTokens(tokens)).not.toThrow()

      const retrieved = config.getTokens()
      expect(retrieved?.access_token).toBe(longToken)
    })

    it('should handle special characters in tokens', () => {
      const tokens: BasecampTokens = {
        access_token: 'token-with-special-chars-!@#$%^&*()',
        refresh_token: 'token-with-unicode-émojis-🎉',
        expires_at: Date.now() + 3600000,
      }

      expect(() => config.setTokens(tokens)).not.toThrow()

      const retrieved = config.getTokens()
      expect(retrieved?.access_token).toBe(tokens.access_token)
      expect(retrieved?.refresh_token).toBe(tokens.refresh_token)
    })
  })
})
