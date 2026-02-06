import { beforeEach, describe, expect, it, vi } from 'vitest'

import { noChatPlugin } from '../src/plugin.js'

// Mock config matching OpenClaw's channels.nochat shape
function makeMockConfig(overrides: Record<string, any> = {}) {
  return {
    channels: {
      nochat: {
        enabled: true,
        serverUrl: 'https://nochat-server.fly.dev',
        apiKey: 'nochat_sk_test',
        agentName: 'Coda',
        agentId: 'coda-uuid',
        trust: { default: 'untrusted', agents: {} },
        ...overrides,
      },
    },
  }
}

describe('noChatPlugin (ChannelPlugin shape)', () => {
  // ── Identity ──────────────────────────────────────────────────────────

  describe('id & meta', () => {
    it("has id 'nochat'", () => {
      expect(noChatPlugin.id).toBe('nochat')
    })

    it('meta.id matches plugin id', () => {
      expect(noChatPlugin.meta.id).toBe('nochat')
    })

    it('has correct label', () => {
      expect(noChatPlugin.meta.label).toBe('NoChat')
    })

    it('has selection label', () => {
      expect(noChatPlugin.meta.selectionLabel).toBe('NoChat (Encrypted Agent Messaging)')
    })

    it('has docs path', () => {
      expect(noChatPlugin.meta.docsPath).toBe('/channels/nochat')
    })

    it('has aliases', () => {
      expect(noChatPlugin.meta.aliases).toContain('nc')
    })

    it('has blurb about post-quantum encryption', () => {
      expect(noChatPlugin.meta.blurb.toLowerCase()).toContain('post-quantum')
    })

    it('has order 80', () => {
      expect(noChatPlugin.meta.order).toBe(80)
    })
  })

  // ── Capabilities ──────────────────────────────────────────────────────

  describe('capabilities', () => {
    it('supports direct chat', () => {
      expect(noChatPlugin.capabilities.chatTypes).toContain('direct')
    })

    it('does not support media', () => {
      expect(noChatPlugin.capabilities.media).toBe(false)
    })

    it('supports reactions', () => {
      expect(noChatPlugin.capabilities.reactions).toBe(true)
    })

    it('supports edit', () => {
      expect(noChatPlugin.capabilities.edit).toBe(true)
    })

    it('supports delete', () => {
      expect(noChatPlugin.capabilities.delete).toBe(true)
    })
  })

  // ── Config ────────────────────────────────────────────────────────────

  describe('config', () => {
    it('listAccountIds returns accounts from config', () => {
      const cfg = makeMockConfig({
        accounts: {
          default: { serverUrl: 'https://a.com', apiKey: 'sk', agentName: 'A' },
          second: { serverUrl: 'https://b.com', apiKey: 'sk', agentName: 'B' },
        },
      })
      const ids = noChatPlugin.config.listAccountIds(cfg)
      expect(ids).toContain('default')
      expect(ids).toContain('second')
    })

    it("listAccountIds returns ['default'] for flat config", () => {
      const cfg = makeMockConfig()
      expect(noChatPlugin.config.listAccountIds(cfg)).toEqual(['default'])
    })

    it('resolveAccount returns proper shape', () => {
      const cfg = makeMockConfig()
      const account = noChatPlugin.config.resolveAccount(cfg, 'default')
      expect(account.accountId).toBe('default')
      expect(account.name).toBe('Coda')
      expect(account.configured).toBe(true)
      expect(account.baseUrl).toBe('https://nochat-server.fly.dev')
    })

    it('defaultAccountId returns default', () => {
      const cfg = makeMockConfig()
      expect(noChatPlugin.config.defaultAccountId!(cfg)).toBe('default')
    })

    it('isConfigured returns true when serverUrl and apiKey present', () => {
      const account = noChatPlugin.config.resolveAccount(makeMockConfig(), 'default')
      expect(noChatPlugin.config.isConfigured(account)).toBe(true)
    })

    it('isConfigured returns false when unconfigured', () => {
      const cfg = makeMockConfig({ serverUrl: '', apiKey: '' })
      const account = noChatPlugin.config.resolveAccount(cfg, 'default')
      expect(noChatPlugin.config.isConfigured(account)).toBe(false)
    })

    it('describeAccount returns snapshot shape', () => {
      const account = noChatPlugin.config.resolveAccount(makeMockConfig(), 'default')
      const desc = noChatPlugin.config.describeAccount!(account)
      expect(desc).toHaveProperty('accountId')
      expect(desc).toHaveProperty('name')
      expect(desc).toHaveProperty('enabled')
      expect(desc).toHaveProperty('configured')
      expect(desc).toHaveProperty('baseUrl')
    })
  })

  // ── Security ──────────────────────────────────────────────────────────

  describe('security', () => {
    it('resolveDmPolicy returns trust policy', () => {
      const cfg = makeMockConfig()
      const account = noChatPlugin.config.resolveAccount(cfg, 'default')
      const result = noChatPlugin.security!.resolveDmPolicy!({
        cfg,
        accountId: 'default',
        account,
      })
      expect(result.policy).toBe('trust')
    })
  })

  // ── Messaging ─────────────────────────────────────────────────────────

  describe('messaging', () => {
    it('normalizeTarget strips nochat: prefix', () => {
      const result = noChatPlugin.messaging!.normalizeTarget!(
        'nochat:eac56417-121f-48b5-848f-5fd57fd01cdf',
      )
      expect(result).toBe('eac56417-121f-48b5-848f-5fd57fd01cdf')
    })

    it('normalizeTarget returns undefined for empty', () => {
      expect(noChatPlugin.messaging!.normalizeTarget!('')).toBeUndefined()
    })

    it('targetResolver.looksLikeId recognizes UUIDs', () => {
      expect(
        noChatPlugin.messaging!.targetResolver!.looksLikeId('eac56417-121f-48b5-848f-5fd57fd01cdf'),
      ).toBe(true)
    })

    it('targetResolver.hint is descriptive', () => {
      expect(noChatPlugin.messaging!.targetResolver!.hint).toContain('agent')
    })
  })

  // ── Outbound ──────────────────────────────────────────────────────────

  describe('outbound', () => {
    it('deliveryMode is direct', () => {
      expect(noChatPlugin.outbound.deliveryMode).toBe('direct')
    })

    it('textChunkLimit is 4000', () => {
      expect(noChatPlugin.outbound.textChunkLimit).toBe(4000)
    })

    it('resolveTarget succeeds for valid target', () => {
      const result = noChatPlugin.outbound.resolveTarget!({ to: 'TXR' })
      expect(result.ok).toBe(true)
      expect((result as any).to).toBe('TXR')
    })

    it('resolveTarget fails for empty target', () => {
      const result = noChatPlugin.outbound.resolveTarget!({ to: '' })
      expect(result.ok).toBe(false)
    })

    it('resolveTarget fails for undefined target', () => {
      const result = noChatPlugin.outbound.resolveTarget!({ to: undefined as any })
      expect(result.ok).toBe(false)
    })

    it('sendText calls the API and returns result', async () => {
      // Mock fetch for this test
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const cfg = makeMockConfig()
      const result = await noChatPlugin.outbound.sendText({
        cfg,
        to: 'conv-id-123',
        text: 'Hello from plugin!',
        accountId: 'default',
      })

      expect(result).toHaveProperty('channel', 'nochat')
      expect(result).toHaveProperty('ok', true)

      vi.unstubAllGlobals()
    })
  })

  // ── Status ────────────────────────────────────────────────────────────

  describe('status', () => {
    it('probeAccount hits /health endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const cfg = makeMockConfig()
      const account = noChatPlugin.config.resolveAccount(cfg, 'default')
      const probe = await noChatPlugin.status!.probeAccount!({
        account,
        timeoutMs: 5000,
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.anything())
      expect(probe).toHaveProperty('ok', true)

      vi.unstubAllGlobals()
    })

    it('probeAccount returns ok=false on failure', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      vi.stubGlobal('fetch', mockFetch)

      const cfg = makeMockConfig()
      const account = noChatPlugin.config.resolveAccount(cfg, 'default')
      const probe = await noChatPlugin.status!.probeAccount!({
        account,
        timeoutMs: 5000,
      })

      expect(probe).toHaveProperty('ok', false)

      vi.unstubAllGlobals()
    })
  })

  // ── Gateway ───────────────────────────────────────────────────────────

  describe('gateway', () => {
    it('has startAccount function', () => {
      expect(noChatPlugin.gateway!.startAccount).toBeTypeOf('function')
    })
  })
})
