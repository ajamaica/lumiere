import { describe, expect, it } from 'vitest'

import {
  looksLikeNoChatTargetId,
  normalizeNoChatTarget,
  parseNoChatTarget,
} from '../src/targets.js'

const UUID_AGENT = 'eac56417-121f-48b5-848f-5fd57fd01cdf'
const UUID_CONVERSATION = '30ae06c2-7c3e-4a1b-9d42-1f8e3b5c6d7a'

describe('NoChat Targets', () => {
  // ── parseNoChatTarget ─────────────────────────────────────────────────

  describe('parseNoChatTarget', () => {
    it('parses a UUID as agent_id', () => {
      const result = parseNoChatTarget(UUID_AGENT)
      expect(result.kind).toBe('agent_id')
      expect(result.value).toBe(UUID_AGENT)
    })

    it('parses a prefixed agent ID (nochat:UUID)', () => {
      const result = parseNoChatTarget(`nochat:${UUID_AGENT}`)
      expect(result.kind).toBe('agent_id')
      expect(result.value).toBe(UUID_AGENT)
    })

    it('parses agent: prefix as agent_name', () => {
      const result = parseNoChatTarget('agent:TXR')
      expect(result.kind).toBe('agent_name')
      expect(result.value).toBe('TXR')
    })

    it('parses conversation: prefix as conversation_id', () => {
      const result = parseNoChatTarget(`conversation:${UUID_CONVERSATION}`)
      expect(result.kind).toBe('conversation_id')
      expect(result.value).toBe(UUID_CONVERSATION)
    })

    it('parses conv: prefix as conversation_id', () => {
      const result = parseNoChatTarget(`conv:${UUID_CONVERSATION}`)
      expect(result.kind).toBe('conversation_id')
      expect(result.value).toBe(UUID_CONVERSATION)
    })

    it('parses a bare name as agent_name', () => {
      const result = parseNoChatTarget('TXR')
      expect(result.kind).toBe('agent_name')
      expect(result.value).toBe('TXR')
    })

    it('strips whitespace', () => {
      const result = parseNoChatTarget('  TXR  ')
      expect(result.value).toBe('TXR')
    })

    it('throws on empty target', () => {
      expect(() => parseNoChatTarget('')).toThrow()
      expect(() => parseNoChatTarget('  ')).toThrow()
    })
  })

  // ── normalizeNoChatTarget ─────────────────────────────────────────────

  describe('normalizeNoChatTarget', () => {
    it('normalizes UUID to itself', () => {
      expect(normalizeNoChatTarget(UUID_AGENT)).toBe(UUID_AGENT)
    })

    it('strips nochat: prefix', () => {
      expect(normalizeNoChatTarget(`nochat:${UUID_AGENT}`)).toBe(UUID_AGENT)
    })

    it('strips agent: prefix and keeps name', () => {
      expect(normalizeNoChatTarget('agent:TXR')).toBe('TXR')
    })

    it('normalizes conversation: prefix', () => {
      expect(normalizeNoChatTarget(`conversation:${UUID_CONVERSATION}`)).toBe(
        `conversation:${UUID_CONVERSATION}`,
      )
    })

    it('returns undefined for empty input', () => {
      expect(normalizeNoChatTarget('')).toBeUndefined()
      expect(normalizeNoChatTarget('  ')).toBeUndefined()
    })

    it('lowercases UUID targets', () => {
      const upper = UUID_AGENT.toUpperCase()
      expect(normalizeNoChatTarget(upper)).toBe(UUID_AGENT.toLowerCase())
    })

    it('preserves agent name casing', () => {
      expect(normalizeNoChatTarget('CaptainAhab')).toBe('CaptainAhab')
    })
  })

  // ── looksLikeNoChatTargetId ───────────────────────────────────────────

  describe('looksLikeNoChatTargetId', () => {
    it('recognizes UUID as target id', () => {
      expect(looksLikeNoChatTargetId(UUID_AGENT)).toBe(true)
    })

    it('recognizes nochat: prefix', () => {
      expect(looksLikeNoChatTargetId(`nochat:${UUID_AGENT}`)).toBe(true)
    })

    it('recognizes agent: prefix', () => {
      expect(looksLikeNoChatTargetId('agent:TXR')).toBe(true)
    })

    it('recognizes conversation: prefix', () => {
      expect(looksLikeNoChatTargetId(`conversation:${UUID_CONVERSATION}`)).toBe(true)
    })

    it('recognizes conv: prefix', () => {
      expect(looksLikeNoChatTargetId(`conv:${UUID_CONVERSATION}`)).toBe(true)
    })

    it('recognizes bare agent names as potential targets', () => {
      // Agent names are alphanumeric/hyphen/underscore — we accept them
      expect(looksLikeNoChatTargetId('TXR')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(looksLikeNoChatTargetId('')).toBe(false)
      expect(looksLikeNoChatTargetId('  ')).toBe(false)
    })
  })
})
