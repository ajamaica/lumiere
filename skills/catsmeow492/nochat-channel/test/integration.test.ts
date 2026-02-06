import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NoChatApiClient } from '../src/api/client.js'
import { NoChatChannel } from '../src/channel.js'
import { SessionRouter } from '../src/session/router.js'
import { PollingTransport } from '../src/transport/polling.js'
import { TrustManager } from '../src/trust/manager.js'
import { TrustStore } from '../src/trust/store.js'
import type { NoChatConfig, NoChatMessage } from '../src/types.js'

const mockFetch = vi.fn()

function makeFullConfig(): NoChatConfig {
  return {
    enabled: true,
    serverUrl: 'https://nochat-server.fly.dev',
    apiKey: 'nochat_sk_test',
    agentName: 'Coda',
    agentId: 'coda-uuid',
    transport: 'polling',
    polling: {
      intervalMs: 15000,
      activeIntervalMs: 5000,
      idleIntervalMs: 60000,
    },
    trust: {
      default: 'untrusted',
      agents: {
        CaptainAhab: 'owner',
        TXR: 'trusted',
        SandboxedAgent: 'sandboxed',
        BlockedBot: 'blocked',
      },
      autoPromote: {
        enabled: true,
        untrusted_to_sandboxed: { interactions: 3 },
        sandboxed_to_trusted: { interactions: 10, requireApproval: true },
      },
    },
    sessions: {
      trusted: {
        model: 'anthropic/claude-sonnet-4-20250514',
        historyLimit: 100,
      },
      sandboxed: {
        model: 'anthropic/claude-sonnet-4-20250514',
        historyLimit: 50,
        maxTurnsPerDay: 50,
      },
      untrusted: {
        model: 'anthropic/claude-haiku-3-20250630',
        historyLimit: 20,
        maxTurnsPerDay: 10,
      },
    },
    rateLimits: {
      global: { maxPerMinute: 60 },
      perAgent: { maxPerMinute: 10 },
      untrusted: { maxPerMinute: 3 },
    },
  }
}

function makeMessage(overrides: Partial<NoChatMessage> = {}): NoChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: 'conv-1',
    sender_id: 'sender-1',
    sender_name: 'TestAgent',
    encrypted_content: btoa('Hello Coda!'),
    message_type: 'text',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('Integration Tests', () => {
  let channel: NoChatChannel

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    channel = new NoChatChannel(makeFullConfig())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Full message flow ─────────────────────────────────────────────────

  describe('full message flow', () => {
    it('processes inbound message from trusted agent end-to-end', () => {
      const msg = makeMessage({
        sender_id: 'txr-id',
        sender_name: 'TXR',
        encrypted_content: btoa('Hey Coda, PR #23 is ready'),
      })

      // 1. Check trust
      const security = channel.checkInbound('txr-id', 'TXR')
      expect(security.allowed).toBe(true)
      expect(security.tier).toBe('trusted')

      // 2. Route to session
      const route = channel.routeMessage('txr-id', 'TXR', 'trusted')
      expect(route).not.toBeNull()
      expect(route!.sessionKey).toContain('nochat:dm:txr-id')

      // 3. Format context
      const ctx = channel.formatInboundContext(msg, 'trusted')
      expect(ctx).toContain('TXR')
      expect(ctx).toContain('trusted')
      expect(ctx).toContain('Hey Coda, PR #23 is ready')

      // 4. Session config
      expect(route!.config.model).toBe('anthropic/claude-sonnet-4-20250514')
    })

    it('sends reply back via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-reply' }),
      })

      const result = await channel.sendText('conv-1', 'LGTM! Ship it.')
      expect(result.ok).toBe(true)
      expect(result.messageId).toBe('msg-reply')
    })
  })

  // ── Owner agent flow ──────────────────────────────────────────────────

  describe('owner agent flow', () => {
    it('routes to main session with full access', () => {
      const msg = makeMessage({
        sender_id: 'ahab-id',
        sender_name: 'CaptainAhab',
        encrypted_content: Buffer.from('🐋 Whale alert!').toString('base64'),
      })

      const security = channel.checkInbound('ahab-id', 'CaptainAhab')
      expect(security.tier).toBe('owner')

      const route = channel.routeMessage('ahab-id', 'CaptainAhab', 'owner')
      expect(route!.sessionKey).toBe('agent:main')

      const ctx = channel.formatInboundContext(msg, 'owner')
      expect(ctx).toContain('[NoChat from CaptainAhab]')
      expect(ctx).not.toContain('(owner)') // lighter format
    })
  })

  // ── Untrusted agent flow ──────────────────────────────────────────────

  describe('untrusted agent flow', () => {
    it('sandboxes unknown agent with restricted config', () => {
      const security = channel.checkInbound('random-id', 'RandomBot')
      expect(security.tier).toBe('untrusted')
      expect(security.allowed).toBe(true)

      const route = channel.routeMessage('random-id', 'RandomBot', 'untrusted')
      expect(route!.sessionKey).toContain('nochat:untrusted:random-id')
      expect(route!.config.model).toBe('anthropic/claude-haiku-3-20250630')
      expect(route!.config.maxTurnsPerDay).toBe(10)
    })
  })

  // ── Blocked agent flow ────────────────────────────────────────────────

  describe('blocked agent flow', () => {
    it('silently drops messages from blocked agents', () => {
      const security = channel.checkInbound('blocked-id', 'BlockedBot')
      expect(security.allowed).toBe(false)
      expect(security.tier).toBe('blocked')

      const route = channel.routeMessage('blocked-id', 'BlockedBot', 'blocked')
      expect(route).toBeNull()
    })
  })

  // ── Trust promotion flow ──────────────────────────────────────────────

  describe('trust promotion flow', () => {
    it('promotes agent after threshold interactions', () => {
      // Starts untrusted
      expect(channel.checkInbound('new-agent', 'NewAgent').tier).toBe('untrusted')

      // Record interactions
      channel.recordInteraction('new-agent')
      channel.recordInteraction('new-agent')
      expect(channel.checkInbound('new-agent', 'NewAgent').tier).toBe('untrusted')

      channel.recordInteraction('new-agent')
      // After 3 interactions → sandboxed
      expect(channel.checkInbound('new-agent', 'NewAgent').tier).toBe('sandboxed')
    })
  })

  // ── Rate limiting ─────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('enforces per-agent rate limits', () => {
      const limiter = channel.getRateLimiter()

      // Untrusted gets 3/min
      for (let i = 0; i < 3; i++) {
        expect(limiter.check('untrusted-agent', 'untrusted')).toBe(true)
      }
      // 4th should be rate limited
      expect(limiter.check('untrusted-agent', 'untrusted')).toBe(false)
    })

    it('different tiers have different limits', () => {
      const limiter = channel.getRateLimiter()

      // Per-agent default: 10/min
      for (let i = 0; i < 10; i++) {
        expect(limiter.check('trusted-agent', 'trusted')).toBe(true)
      }
      expect(limiter.check('trusted-agent', 'trusted')).toBe(false)
    })
  })

  // ── Error recovery ────────────────────────────────────────────────────

  describe('error recovery', () => {
    it('handles API errors without crashing channel', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      const result = await channel.sendText('conv-1', 'test')
      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('channel remains functional after error', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Timeout'))
      await channel.sendText('conv-1', 'test')

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-ok' }),
      })
      const result = await channel.sendText('conv-1', 'recovered')
      expect(result.ok).toBe(true)
    })
  })

  // ── Component wiring ──────────────────────────────────────────────────

  describe('component wiring', () => {
    it('trust manager uses correct config', () => {
      // Verify all configured agents are recognized
      expect(channel.checkInbound('any', 'CaptainAhab').tier).toBe('owner')
      expect(channel.checkInbound('any', 'TXR').tier).toBe('trusted')
      expect(channel.checkInbound('any', 'SandboxedAgent').tier).toBe('sandboxed')
      expect(channel.checkInbound('any', 'BlockedBot').tier).toBe('blocked')
      expect(channel.checkInbound('any', 'Unknown').tier).toBe('untrusted')
    })

    it('session router uses correct session config', () => {
      const trusted = channel.routeMessage('id', 'TXR', 'trusted')
      expect(trusted!.config.model).toBe('anthropic/claude-sonnet-4-20250514')

      const untrusted = channel.routeMessage('id', 'Bot', 'untrusted')
      expect(untrusted!.config.model).toBe('anthropic/claude-haiku-3-20250630')
    })
  })
})
