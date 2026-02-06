import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { TrustStore } from '../src/trust/store.js'

describe('TrustStore', () => {
  let store: TrustStore

  beforeEach(() => {
    store = new TrustStore()
  })

  // ── In-memory operations ──────────────────────────────────────────────

  describe('interaction counts', () => {
    it('returns 0 for unknown agent', () => {
      expect(store.getInteractionCount('unknown')).toBe(0)
    })

    it('increments interaction counter', () => {
      expect(store.incrementInteraction('agent-a')).toBe(1)
      expect(store.incrementInteraction('agent-a')).toBe(2)
      expect(store.incrementInteraction('agent-a')).toBe(3)
    })

    it('tracks counts per agent independently', () => {
      store.incrementInteraction('agent-a')
      store.incrementInteraction('agent-a')
      store.incrementInteraction('agent-b')
      expect(store.getInteractionCount('agent-a')).toBe(2)
      expect(store.getInteractionCount('agent-b')).toBe(1)
    })
  })

  describe('runtime overrides', () => {
    it('returns empty overrides initially', () => {
      expect(store.getRuntimeOverrides()).toEqual({})
    })

    it('sets and gets a runtime override', () => {
      store.setRuntimeOverride('AgentX', 'trusted')
      expect(store.getRuntimeOverride('AgentX')).toBe('trusted')
    })

    it('returns undefined for unset override', () => {
      expect(store.getRuntimeOverride('nobody')).toBeUndefined()
    })

    it('overrides accumulate', () => {
      store.setRuntimeOverride('A', 'trusted')
      store.setRuntimeOverride('B', 'blocked')
      expect(store.getRuntimeOverrides()).toEqual({ A: 'trusted', B: 'blocked' })
    })

    it('overwrites existing override', () => {
      store.setRuntimeOverride('X', 'trusted')
      store.setRuntimeOverride('X', 'blocked')
      expect(store.getRuntimeOverride('X')).toBe('blocked')
    })
  })

  describe('pending promotions', () => {
    it('has no pending promotion initially', () => {
      expect(store.hasPendingPromotion('agent-a')).toBe(false)
    })

    it('sets and gets pending promotion', () => {
      store.setPendingPromotion('agent-a', 'trusted')
      expect(store.hasPendingPromotion('agent-a')).toBe(true)
      expect(store.getPendingPromotion('agent-a')).toBe('trusted')
    })

    it('clears pending promotion', () => {
      store.setPendingPromotion('agent-b', 'trusted')
      store.clearPendingPromotion('agent-b')
      expect(store.hasPendingPromotion('agent-b')).toBe(false)
    })
  })

  describe('constructor with initial state', () => {
    it('accepts initial state', () => {
      const s = new TrustStore({
        interactionCounts: { 'agent-a': 5 },
        runtimeOverrides: { 'agent-b': 'trusted' },
      })
      expect(s.getInteractionCount('agent-a')).toBe(5)
      expect(s.getRuntimeOverride('agent-b')).toBe('trusted')
    })
  })

  // ── File persistence ──────────────────────────────────────────────────

  describe('file persistence', () => {
    const testDir = join(tmpdir(), `nochat-trust-test-${Date.now()}`)
    const testFile = join(testDir, '.nochat-trust.json')

    afterEach(async () => {
      try {
        await rm(testDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    })

    it('save and load round-trip', async () => {
      store.incrementInteraction('agent-a')
      store.incrementInteraction('agent-a')
      store.setRuntimeOverride('agent-b', 'owner')
      store.setPendingPromotion('agent-c', 'trusted')

      await store.saveToFile(testFile)

      const loaded = new TrustStore()
      const ok = await loaded.loadFromFile(testFile)
      expect(ok).toBe(true)
      expect(loaded.getInteractionCount('agent-a')).toBe(2)
      expect(loaded.getRuntimeOverride('agent-b')).toBe('owner')
      expect(loaded.hasPendingPromotion('agent-c')).toBe(true)
    })

    it('handles missing file gracefully', async () => {
      const loaded = new TrustStore()
      const ok = await loaded.loadFromFile(join(testDir, 'nonexistent.json'))
      expect(ok).toBe(false)
      expect(loaded.getInteractionCount('any')).toBe(0)
    })

    it('handles corrupt file gracefully', async () => {
      await mkdir(testDir, { recursive: true })
      await writeFile(testFile, 'not valid json {{{', 'utf-8')

      const loaded = new TrustStore()
      const ok = await loaded.loadFromFile(testFile)
      expect(ok).toBe(false)
      expect(loaded.getInteractionCount('any')).toBe(0)
    })

    it('runtime overrides persist across save/load', async () => {
      store.setRuntimeOverride('X', 'sandboxed')
      store.setRuntimeOverride('Y', 'blocked')
      await store.saveToFile(testFile)

      const loaded = new TrustStore()
      await loaded.loadFromFile(testFile)
      expect(loaded.getRuntimeOverrides()).toEqual({
        X: 'sandboxed',
        Y: 'blocked',
      })
    })
  })

  // ── State snapshot ────────────────────────────────────────────────────

  describe('getState', () => {
    it('returns a copy of the state', () => {
      store.incrementInteraction('a')
      store.setRuntimeOverride('b', 'trusted')
      const state = store.getState()
      expect(state.interactionCounts).toEqual({ a: 1 })
      expect(state.runtimeOverrides).toEqual({ b: 'trusted' })

      // Mutating returned state shouldn't affect store
      state.interactionCounts['a'] = 999
      expect(store.getInteractionCount('a')).toBe(1)
    })
  })
})
