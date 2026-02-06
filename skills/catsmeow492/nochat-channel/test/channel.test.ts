import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NoChatChannel } from '../src/channel.js'
import type { NoChatConfig } from '../src/types.js'

const mockFetch = vi.fn()

function makeConfig(overrides: Partial<NoChatConfig> = {}): NoChatConfig {
  return {
    enabled: true,
    serverUrl: 'https://nochat-server.fly.dev',
    apiKey: 'nochat_sk_test',
    agentName: 'Coda',
    agentId: 'coda-uuid',
    trust: {
      default: 'untrusted',
      agents: {
        CaptainAhab: 'owner',
        TXR: 'trusted',
        ShadyBot: 'blocked',
      },
    },
    sessions: {
      trusted: {
        model: 'anthropic/claude-sonnet-4-20250514',
        historyLimit: 100,
      },
      untrusted: {
        model: 'anthropic/claude-haiku-3-20250630',
        historyLimit: 20,
        maxTurnsPerDay: 10,
      },
    },
    ...overrides,
  }
}

describe('NoChatChannel', () => {
  let channel: NoChatChannel

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    channel = new NoChatChannel(makeConfig())
  })

  // ── Meta ──────────────────────────────────────────────────────────────

  describe('meta', () => {
    it('has correct channel id', () => {
      const plugin = channel.getPlugin()
      expect(plugin.id).toBe('nochat')
      expect(plugin.meta.id).toBe('nochat')
    })

    it('has correct label and aliases', () => {
      const plugin = channel.getPlugin()
      expect(plugin.meta.label).toBe('NoChat')
      expect(plugin.meta.aliases).toContain('nc')
    })

    it('has correct blurb', () => {
      const plugin = channel.getPlugin()
      expect(plugin.meta.blurb.toLowerCase()).toContain('agent-to-agent')
    })
  })

  // ── Capabilities ──────────────────────────────────────────────────────

  describe('capabilities', () => {
    it('supports direct chat', () => {
      const plugin = channel.getPlugin()
      expect(plugin.capabilities.chatTypes).toContain('direct')
    })

    it('does not support media in phase 1', () => {
      const plugin = channel.getPlugin()
      expect(plugin.capabilities.media).toBe(false)
    })

    it('supports reactions, edit, delete', () => {
      const plugin = channel.getPlugin()
      expect(plugin.capabilities.reactions).toBe(true)
      expect(plugin.capabilities.edit).toBe(true)
      expect(plugin.capabilities.delete).toBe(true)
    })
  })

  // ── Config ────────────────────────────────────────────────────────────

  describe('config', () => {
    it('resolves account from config', () => {
      const account = channel.resolveAccount()
      expect(account.accountId).toBe('Coda')
      expect(account.configured).toBe(true)
      expect(account.baseUrl).toBe('https://nochat-server.fly.dev')
    })

    it('isConfigured returns true when serverUrl and apiKey are set', () => {
      expect(channel.isConfigured()).toBe(true)
    })

    it('isConfigured returns false when apiKey is missing', () => {
      const c = new NoChatChannel(makeConfig({ apiKey: '' }))
      expect(c.isConfigured()).toBe(false)
    })
  })

  // ── Security ──────────────────────────────────────────────────────────

  describe('security', () => {
    it('allows trusted agents', () => {
      const result = channel.checkInbound('some-id', 'TXR')
      expect(result.allowed).toBe(true)
    })

    it('allows owner agents', () => {
      const result = channel.checkInbound('some-id', 'CaptainAhab')
      expect(result.allowed).toBe(true)
    })

    it('allows untrusted agents with restrictions', () => {
      const result = channel.checkInbound('unknown-id', 'UnknownBot')
      expect(result.allowed).toBe(true)
      expect(result.tier).toBe('untrusted')
    })

    it('blocks blocked agents', () => {
      const result = channel.checkInbound('some-id', 'ShadyBot')
      expect(result.allowed).toBe(false)
      expect(result.tier).toBe('blocked')
    })
  })

  // ── Outbound ──────────────────────────────────────────────────────────

  describe('outbound', () => {
    it('sendText calls API client correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-sent' }),
      })

      const result = await channel.sendText('conv-1', 'Hello TXR!')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(btoa('Hello TXR!')),
        }),
      )
      expect(result.ok).toBe(true)
    })

    it('handles send failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
        text: () => Promise.resolve('Server error'),
      })

      const result = await channel.sendText('conv-1', 'test')
      expect(result.ok).toBe(false)
    })

    it('react calls API client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

      const result = await channel.react('conv-1', 'msg-1', '👍')
      expect(result.ok).toBe(true)
    })

    it('edit calls API client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

      const result = await channel.editMessage('conv-1', 'msg-1', 'Updated')
      expect(result.ok).toBe(true)
    })

    it('delete calls API client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })

      const result = await channel.deleteMessage('conv-1', 'msg-1')
      expect(result.ok).toBe(true)
    })
  })

  // ── Trust integration ─────────────────────────────────────────────────

  describe('trust integration', () => {
    it('routes owner messages to main session', () => {
      const route = channel.routeMessage('owner-sender', 'CaptainAhab', 'owner')
      expect(route).not.toBeNull()
      expect(route!.sessionKey).toBe('agent:main')
    })

    it('routes trusted messages to isolated session', () => {
      const route = channel.routeMessage('txr-id', 'TXR', 'trusted')
      expect(route).not.toBeNull()
      expect(route!.sessionKey).toContain('nochat:dm:')
    })

    it('routes blocked messages to null', () => {
      const route = channel.routeMessage('shady-id', 'ShadyBot', 'blocked')
      expect(route).toBeNull()
    })

    it('formats context for trusted agent', () => {
      const ctx = channel.formatInboundContext(
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'txr-id',
          sender_name: 'TXR',
          encrypted_content: btoa('Hey Coda!'),
          message_type: 'text',
          created_at: new Date().toISOString(),
        },
        'trusted',
      )
      expect(ctx).toContain('TXR')
      expect(ctx).toContain('trusted')
      expect(ctx).toContain('Hey Coda!')
    })
  })
})
