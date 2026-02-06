import { beforeEach, describe, expect, it } from 'vitest'

import { TrustManager } from '../src/trust/manager.js'
import { TrustStore } from '../src/trust/store.js'
import type { TrustConfig, TrustTier } from '../src/types.js'

function makeConfig(overrides: Partial<TrustConfig> = {}): TrustConfig {
  return {
    default: 'untrusted',
    agents: {},
    ...overrides,
  }
}

function makeStore(): TrustStore {
  return new TrustStore() // in-memory, no file path
}

describe('TrustManager', () => {
  let manager: TrustManager
  let store: TrustStore

  beforeEach(() => {
    store = makeStore()
    manager = new TrustManager(
      makeConfig({
        agents: {
          TXR: 'trusted',
          CaptainAhab: 'owner',
          ShadyBot: 'blocked',
          '67793687-4a45-480a-862f-d1a5d7ec4632': 'trusted',
          nc1abc123def456: 'owner',
        },
      }),
      store,
    )
  })

  // ── Resolution by agent name ──────────────────────────────────────────

  describe('resolveTrust', () => {
    it('resolves trust by agent name (exact match)', () => {
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('trusted')
    })

    it('resolves trust by agent name (case insensitive)', () => {
      expect(manager.resolveTrust('some-id', 'txr')).toBe('trusted')
      expect(manager.resolveTrust('some-id', 'Txr')).toBe('trusted')
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('trusted')
    })

    it('resolves trust by user_id (exact match)', () => {
      expect(manager.resolveTrust('67793687-4a45-480a-862f-d1a5d7ec4632')).toBe('trusted')
    })

    it('resolves trust by fingerprint (exact match)', () => {
      expect(manager.resolveTrust('unknown-id', undefined, 'nc1abc123def456')).toBe('owner')
    })

    it('priority: fingerprint > user_id > name', () => {
      // Fingerprint wins over everything
      const mgr = new TrustManager(
        makeConfig({
          agents: {
            'agent-123': 'untrusted',
            AgentX: 'sandboxed',
            'fp-xyz': 'owner',
          },
        }),
        makeStore(),
      )

      // All three match — fingerprint should win
      expect(mgr.resolveTrust('agent-123', 'AgentX', 'fp-xyz')).toBe('owner')

      // user_id + name match — user_id should win
      expect(mgr.resolveTrust('agent-123', 'AgentX')).toBe('untrusted')
    })

    it('returns default tier when no match', () => {
      expect(manager.resolveTrust('unknown-id', 'UnknownAgent')).toBe('untrusted')
    })

    it('returns default tier when no name or fingerprint provided', () => {
      expect(manager.resolveTrust('totally-unknown-id')).toBe('untrusted')
    })

    it('empty config returns default tier for everyone', () => {
      const mgr = new TrustManager(makeConfig(), makeStore())
      expect(mgr.resolveTrust('any-id', 'AnyName')).toBe('untrusted')
    })

    it("config with default 'blocked' blocks everyone without explicit trust", () => {
      const mgr = new TrustManager(
        makeConfig({
          default: 'blocked',
          agents: { OnlyFriend: 'trusted' },
        }),
        makeStore(),
      )
      expect(mgr.resolveTrust('random-id', 'RandomBot')).toBe('blocked')
      expect(mgr.resolveTrust('random-id', 'OnlyFriend')).toBe('trusted')
    })

    it('multiple agents with different tiers resolve correctly', () => {
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('trusted')
      expect(manager.resolveTrust('some-id', 'CaptainAhab')).toBe('owner')
      expect(manager.resolveTrust('some-id', 'ShadyBot')).toBe('blocked')
    })
  })

  // ── Runtime trust overrides ───────────────────────────────────────────

  describe('setTrust', () => {
    it('sets trust for a new agent', () => {
      manager.setTrust('NewAgent', 'sandboxed')
      expect(manager.resolveTrust('some-id', 'NewAgent')).toBe('sandboxed')
    })

    it('overrides config-based trust at runtime', () => {
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('trusted')
      manager.setTrust('TXR', 'blocked')
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('blocked')
    })

    it('set by user_id overrides config', () => {
      manager.setTrust('67793687-4a45-480a-862f-d1a5d7ec4632', 'owner')
      expect(manager.resolveTrust('67793687-4a45-480a-862f-d1a5d7ec4632')).toBe('owner')
    })
  })

  // ── Promotion ─────────────────────────────────────────────────────────

  describe('promoteTrust', () => {
    it('promotes untrusted → sandboxed', () => {
      manager.setTrust('agent-a', 'untrusted')
      manager.promoteTrust('agent-a')
      expect(manager.resolveTrust('agent-a')).toBe('sandboxed')
    })

    it('promotes sandboxed → trusted', () => {
      manager.setTrust('agent-b', 'sandboxed')
      manager.promoteTrust('agent-b')
      expect(manager.resolveTrust('agent-b')).toBe('trusted')
    })

    it('promote stops at trusted (never auto-promote to owner)', () => {
      manager.setTrust('agent-c', 'trusted')
      manager.promoteTrust('agent-c')
      expect(manager.resolveTrust('agent-c')).toBe('trusted')
    })

    it('promotes blocked → untrusted', () => {
      manager.setTrust('agent-d', 'blocked')
      manager.promoteTrust('agent-d')
      expect(manager.resolveTrust('agent-d')).toBe('untrusted')
    })
  })

  // ── Demotion ──────────────────────────────────────────────────────────

  describe('demoteTrust', () => {
    it('demotes trusted → sandboxed', () => {
      manager.setTrust('agent-e', 'trusted')
      manager.demoteTrust('agent-e')
      expect(manager.resolveTrust('agent-e')).toBe('sandboxed')
    })

    it('demotes sandboxed → untrusted', () => {
      manager.setTrust('agent-f', 'sandboxed')
      manager.demoteTrust('agent-f')
      expect(manager.resolveTrust('agent-f')).toBe('untrusted')
    })

    it('demotes untrusted → blocked', () => {
      manager.setTrust('agent-g', 'untrusted')
      manager.demoteTrust('agent-g')
      expect(manager.resolveTrust('agent-g')).toBe('blocked')
    })

    it('demote stops at blocked', () => {
      manager.setTrust('agent-h', 'blocked')
      manager.demoteTrust('agent-h')
      expect(manager.resolveTrust('agent-h')).toBe('blocked')
    })

    it('demotes owner → trusted', () => {
      manager.setTrust('agent-i', 'owner')
      manager.demoteTrust('agent-i')
      expect(manager.resolveTrust('agent-i')).toBe('trusted')
    })
  })

  // ── Blocking ──────────────────────────────────────────────────────────

  describe('blockAgent', () => {
    it('sets agent to blocked', () => {
      manager.blockAgent('agent-j')
      expect(manager.resolveTrust('agent-j')).toBe('blocked')
    })

    it('blocks a previously trusted agent', () => {
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('trusted')
      manager.blockAgent('TXR')
      expect(manager.resolveTrust('some-id', 'TXR')).toBe('blocked')
    })
  })

  // ── Trust list ────────────────────────────────────────────────────────

  describe('getTrustList', () => {
    it('returns all agents from config and runtime', () => {
      manager.setTrust('RuntimeAgent', 'sandboxed')
      const list = manager.getTrustList()
      expect(list).toContainEqual({ identifier: 'TXR', tier: 'trusted' })
      expect(list).toContainEqual({ identifier: 'CaptainAhab', tier: 'owner' })
      expect(list).toContainEqual({ identifier: 'RuntimeAgent', tier: 'sandboxed' })
    })

    it('runtime overrides appear with updated tier', () => {
      manager.setTrust('TXR', 'owner')
      const list = manager.getTrustList()
      const txr = list.find((e) => e.identifier === 'TXR')
      expect(txr?.tier).toBe('owner')
    })
  })

  // ── Auto-promotion ────────────────────────────────────────────────────

  describe('auto-promotion', () => {
    it('auto-promotes after N interactions (untrusted → sandboxed)', () => {
      const mgr = new TrustManager(
        makeConfig({
          autoPromote: {
            enabled: true,
            untrusted_to_sandboxed: { interactions: 3 },
          },
        }),
        makeStore(),
      )

      // Starts untrusted
      expect(mgr.resolveTrust('agent-x')).toBe('untrusted')

      mgr.recordInteraction('agent-x')
      mgr.recordInteraction('agent-x')
      expect(mgr.resolveTrust('agent-x')).toBe('untrusted')

      mgr.recordInteraction('agent-x') // 3rd interaction
      expect(mgr.resolveTrust('agent-x')).toBe('sandboxed')
    })

    it('auto-promotes sandboxed → trusted after N interactions', () => {
      const s = makeStore()
      const mgr = new TrustManager(
        makeConfig({
          autoPromote: {
            enabled: true,
            untrusted_to_sandboxed: { interactions: 2 },
            sandboxed_to_trusted: { interactions: 5 },
          },
        }),
        s,
      )

      // Drive from untrusted → sandboxed
      mgr.recordInteraction('agent-y')
      mgr.recordInteraction('agent-y')
      expect(mgr.resolveTrust('agent-y')).toBe('sandboxed')

      // Continue interactions: 3, 4, 5, 6, 7
      mgr.recordInteraction('agent-y')
      mgr.recordInteraction('agent-y')
      mgr.recordInteraction('agent-y')
      expect(mgr.resolveTrust('agent-y')).toBe('sandboxed') // count=5 but threshold is 5 from sandboxed
      mgr.recordInteraction('agent-y')
      mgr.recordInteraction('agent-y') // 7 total
      expect(mgr.resolveTrust('agent-y')).toBe('trusted')
    })

    it('auto-promote disabled when autoPromote.enabled is false', () => {
      const mgr = new TrustManager(
        makeConfig({
          autoPromote: {
            enabled: false,
            untrusted_to_sandboxed: { interactions: 1 },
          },
        }),
        makeStore(),
      )

      mgr.recordInteraction('agent-z')
      mgr.recordInteraction('agent-z')
      mgr.recordInteraction('agent-z')
      expect(mgr.resolveTrust('agent-z')).toBe('untrusted')
    })

    it("auto-promote with requireApproval flags but doesn't promote", () => {
      const mgr = new TrustManager(
        makeConfig({
          autoPromote: {
            enabled: true,
            untrusted_to_sandboxed: { interactions: 2 },
            sandboxed_to_trusted: { interactions: 3, requireApproval: true },
          },
        }),
        makeStore(),
      )

      // Get to sandboxed first
      mgr.recordInteraction('agent-w')
      mgr.recordInteraction('agent-w')
      expect(mgr.resolveTrust('agent-w')).toBe('sandboxed')

      // Hit threshold for sandboxed→trusted but requireApproval=true
      mgr.recordInteraction('agent-w')
      mgr.recordInteraction('agent-w')
      mgr.recordInteraction('agent-w')
      mgr.recordInteraction('agent-w')
      mgr.recordInteraction('agent-w')
      // Should still be sandboxed, not auto-promoted
      expect(mgr.resolveTrust('agent-w')).toBe('sandboxed')
      // But should be flagged for manual promotion
      expect(mgr.shouldAutoPromote('agent-w')).toBe(true)
    })

    it("blocked agent stays blocked (can't be auto-promoted)", () => {
      const mgr = new TrustManager(
        makeConfig({
          agents: { BadBot: 'blocked' },
          autoPromote: {
            enabled: true,
            untrusted_to_sandboxed: { interactions: 1 },
          },
        }),
        makeStore(),
      )

      mgr.recordInteraction('some-id') // for BadBot resolved by id
      // Manually set blocked and record
      mgr.blockAgent('some-agent')
      mgr.recordInteraction('some-agent')
      mgr.recordInteraction('some-agent')
      expect(mgr.resolveTrust('some-agent')).toBe('blocked')
    })

    it('shouldAutoPromote returns false when no promotion pending', () => {
      const mgr = new TrustManager(
        makeConfig({
          autoPromote: { enabled: true },
        }),
        makeStore(),
      )
      expect(mgr.shouldAutoPromote('nobody')).toBe(false)
    })
  })
})
