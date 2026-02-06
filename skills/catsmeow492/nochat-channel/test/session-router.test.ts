import { describe, expect, it } from 'vitest'

import { SessionRouter } from '../src/session/router.js'
import type { NoChatMessage, SessionConfig, TrustTier } from '../src/types.js'

const sessionConfig: SessionConfig = {
  owner: {},
  trusted: {
    model: 'anthropic/claude-sonnet-4-20250514',
    historyLimit: 100,
    systemPrompt: 'You are Coda, talking to a trusted agent.',
    tools: { allow: ['web_search', 'exec'], deny: ['message'] },
  },
  sandboxed: {
    model: 'anthropic/claude-sonnet-4-20250514',
    historyLimit: 50,
    maxTurnsPerDay: 50,
    tools: { allow: ['web_search', 'read'], deny: ['exec', 'write'] },
  },
  untrusted: {
    model: 'anthropic/claude-haiku-3-20250630',
    historyLimit: 20,
    maxTurnsPerDay: 10,
    autoExpireMinutes: 1440,
    tools: { allow: ['web_search'], deny: ['*'] },
  },
}

describe('SessionRouter', () => {
  const router = new SessionRouter(sessionConfig)
  const agentId = 'coda-agent-id'

  // ── routeMessage ──────────────────────────────────────────────────────

  describe('routeMessage', () => {
    it('owner maps to agent:main', () => {
      const result = router.routeMessage(agentId, 'sender-1', 'CaptainAhab', 'owner')
      expect(result).not.toBeNull()
      expect(result!.sessionKey).toBe('agent:main')
    })

    it('trusted maps to agent:<agentId>:nochat:dm:<senderId>', () => {
      const result = router.routeMessage(agentId, 'sender-2', 'TXR', 'trusted')
      expect(result).not.toBeNull()
      expect(result!.sessionKey).toBe(`agent:${agentId}:nochat:dm:sender-2`)
    })

    it('sandboxed maps to agent:<agentId>:nochat:sandbox:<senderId>', () => {
      const result = router.routeMessage(agentId, 'sender-3', 'SomeAgent', 'sandboxed')
      expect(result).not.toBeNull()
      expect(result!.sessionKey).toBe(`agent:${agentId}:nochat:sandbox:sender-3`)
    })

    it('untrusted maps to agent:<agentId>:nochat:untrusted:<senderId>', () => {
      const result = router.routeMessage(agentId, 'sender-4', 'Unknown', 'untrusted')
      expect(result).not.toBeNull()
      expect(result!.sessionKey).toBe(`agent:${agentId}:nochat:untrusted:sender-4`)
    })

    it('blocked returns null', () => {
      const result = router.routeMessage(agentId, 'sender-5', 'BadBot', 'blocked')
      expect(result).toBeNull()
    })

    it('includes session config for the tier', () => {
      const result = router.routeMessage(agentId, 'sender-6', 'Agent', 'trusted')
      expect(result).not.toBeNull()
      expect(result!.config.model).toBe('anthropic/claude-sonnet-4-20250514')
      expect(result!.config.historyLimit).toBe(100)
    })
  })

  // ── formatInboundContext ───────────────────────────────────────────────

  describe('formatInboundContext', () => {
    const msg: NoChatMessage = {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: '67793687-4a45-480a-862f-d1a5d7ec4632',
      sender_name: 'TXR',
      encrypted_content: btoa('Hello Coda!'),
      message_type: 'text',
      created_at: '2026-02-01T21:00:00Z',
    }

    it('includes agent name and trust tier for trusted', () => {
      const ctx = router.formatInboundContext(msg, 'trusted')
      expect(ctx).toContain('[NoChat DM from TXR (trusted)')
      expect(ctx).toContain('Hello Coda!')
    })

    it('includes agent name and trust tier for untrusted', () => {
      const untrustedMsg = { ...msg, sender_name: 'RandomBot' }
      const ctx = router.formatInboundContext(untrustedMsg, 'untrusted')
      expect(ctx).toContain('[NoChat DM from RandomBot (untrusted)')
    })

    it('context for owner tier is lighter', () => {
      const ownerMsg = { ...msg, sender_name: 'CaptainAhab' }
      const ctx = router.formatInboundContext(ownerMsg, 'owner')
      expect(ctx).toContain('[NoChat from CaptainAhab]')
      // Should NOT contain the (owner) trust annotation for cleaner UX
      expect(ctx).not.toContain('(owner)')
    })

    it('decodes base64 content', () => {
      const ctx = router.formatInboundContext(msg, 'trusted')
      expect(ctx).toContain('Hello Coda!')
    })

    it('includes sender_id in context for non-owner tiers', () => {
      const ctx = router.formatInboundContext(msg, 'trusted')
      expect(ctx).toContain('67793687')
    })
  })

  // ── getSessionConfig ──────────────────────────────────────────────────

  describe('getSessionConfig', () => {
    it('returns correct config for trusted tier', () => {
      const cfg = router.getSessionConfig('trusted')
      expect(cfg.model).toBe('anthropic/claude-sonnet-4-20250514')
      expect(cfg.historyLimit).toBe(100)
      expect(cfg.tools?.allow).toContain('web_search')
    })

    it('returns correct config for sandboxed tier', () => {
      const cfg = router.getSessionConfig('sandboxed')
      expect(cfg.maxTurnsPerDay).toBe(50)
      expect(cfg.tools?.deny).toContain('exec')
    })

    it('returns correct config for untrusted tier', () => {
      const cfg = router.getSessionConfig('untrusted')
      expect(cfg.model).toBe('anthropic/claude-haiku-3-20250630')
      expect(cfg.maxTurnsPerDay).toBe(10)
      expect(cfg.autoExpireMinutes).toBe(1440)
    })

    it('returns empty config for owner tier', () => {
      const cfg = router.getSessionConfig('owner')
      expect(cfg).toEqual({})
    })

    it('returns empty config when no tier-specific config exists', () => {
      const emptyRouter = new SessionRouter({})
      const cfg = emptyRouter.getSessionConfig('trusted')
      expect(cfg).toEqual({})
    })

    it('returns empty config for blocked tier', () => {
      const cfg = router.getSessionConfig('blocked')
      expect(cfg).toEqual({})
    })
  })
})
