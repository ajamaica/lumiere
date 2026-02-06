// Polyfill File global before any require that might load undici
if (typeof globalThis.File === 'undefined') {
  // @ts-expect-error - minimal File mock for undici compatibility
  globalThis.File = class File {
    name: string
    type: string
    size: number
    lastModified: number
    constructor(bits: any[], name: string, options?: { type?: string; lastModified?: number }) {
      this.name = name
      this.type = options?.type || ''
      this.size = bits.reduce((acc: number, b: any) => acc + (b?.length || 0), 0)
      this.lastModified = options?.lastModified || Date.now()
    }
  }
}

import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the backend for SessionMemory
const createMockBackend = () => ({
  textToOrderedState: vi.fn((text: string) => ({
    c: new Float32Array([
      0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8,
    ]),
  })),
})

// Import the module
const { ImmediateBuffer, SessionMemory, PersistentMemory, ContextMemory } = require('../memory')

describe('Memory Module', () => {
  // ==========================================================================
  // IMMEDIATE BUFFER
  // ==========================================================================
  describe('ImmediateBuffer', () => {
    describe('constructor', () => {
      it('should create buffer with default size of 10', () => {
        const buffer = new ImmediateBuffer()
        expect(buffer.size).toBe(10)
        expect(buffer.buffer).toEqual([])
      })

      it('should create buffer with custom size', () => {
        const buffer = new ImmediateBuffer(5)
        expect(buffer.size).toBe(5)
      })
    })

    describe('add', () => {
      it('should add exchange with timestamp', () => {
        const buffer = new ImmediateBuffer()
        const exchange = { user: 'Hello', assistant: 'Hi there' }

        buffer.add(exchange)

        expect(buffer.buffer.length).toBe(1)
        expect(buffer.buffer[0].user).toBe('Hello')
        expect(buffer.buffer[0].assistant).toBe('Hi there')
        expect(buffer.buffer[0].timestamp).toBeDefined()
      })

      it('should maintain size limit by removing oldest entries', () => {
        const buffer = new ImmediateBuffer(3)

        buffer.add({ user: 'msg1', assistant: 'resp1' })
        buffer.add({ user: 'msg2', assistant: 'resp2' })
        buffer.add({ user: 'msg3', assistant: 'resp3' })
        buffer.add({ user: 'msg4', assistant: 'resp4' })

        expect(buffer.buffer.length).toBe(3)
        expect(buffer.buffer[0].user).toBe('msg2')
        expect(buffer.buffer[2].user).toBe('msg4')
      })
    })

    describe('getAll', () => {
      it('should return copy of all exchanges', () => {
        const buffer = new ImmediateBuffer()
        buffer.add({ user: 'a', assistant: 'b' })
        buffer.add({ user: 'c', assistant: 'd' })

        const all = buffer.getAll()

        expect(all.length).toBe(2)
        // Should be a copy
        all.push({ user: 'e', assistant: 'f', timestamp: Date.now() })
        expect(buffer.buffer.length).toBe(2)
      })
    })

    describe('getLast', () => {
      it('should return last n exchanges', () => {
        const buffer = new ImmediateBuffer()
        buffer.add({ user: 'a', assistant: 'b' })
        buffer.add({ user: 'c', assistant: 'd' })
        buffer.add({ user: 'e', assistant: 'f' })

        const last2 = buffer.getLast(2)

        expect(last2.length).toBe(2)
        expect(last2[0].user).toBe('c')
        expect(last2[1].user).toBe('e')
      })

      it('should default to 5 if not specified', () => {
        const buffer = new ImmediateBuffer()
        for (let i = 0; i < 10; i++) {
          buffer.add({ user: `u${i}`, assistant: `a${i}` })
        }

        const last = buffer.getLast()
        expect(last.length).toBe(5)
      })

      it('should return all if less than n available', () => {
        const buffer = new ImmediateBuffer()
        buffer.add({ user: 'a', assistant: 'b' })

        const last5 = buffer.getLast(5)
        expect(last5.length).toBe(1)
      })
    })

    describe('clear', () => {
      it('should empty the buffer', () => {
        const buffer = new ImmediateBuffer()
        buffer.add({ user: 'a', assistant: 'b' })
        buffer.add({ user: 'c', assistant: 'd' })

        buffer.clear()

        expect(buffer.buffer.length).toBe(0)
      })
    })

    describe('toMessages', () => {
      it('should convert exchanges to message format', () => {
        const buffer = new ImmediateBuffer()
        buffer.add({ user: 'Hello', assistant: 'Hi' })
        buffer.add({ user: 'How are you?', assistant: 'Good!' })

        const messages = buffer.toMessages()

        expect(messages.length).toBe(4)
        expect(messages[0]).toEqual({ role: 'user', content: 'Hello' })
        expect(messages[1]).toEqual({ role: 'assistant', content: 'Hi' })
        expect(messages[2]).toEqual({ role: 'user', content: 'How are you?' })
        expect(messages[3]).toEqual({ role: 'assistant', content: 'Good!' })
      })

      it('should return empty array for empty buffer', () => {
        const buffer = new ImmediateBuffer()
        expect(buffer.toMessages()).toEqual([])
      })
    })
  })

  // ==========================================================================
  // SESSION MEMORY
  // ==========================================================================
  describe('SessionMemory', () => {
    let mockBackend: ReturnType<typeof createMockBackend>

    beforeEach(() => {
      mockBackend = createMockBackend()
    })

    describe('constructor', () => {
      it('should initialize with empty exchanges and index', () => {
        const session = new SessionMemory(mockBackend)

        expect(session.exchanges).toEqual([])
        expect(session.index.size).toBe(0)
      })
    })

    describe('add', () => {
      it('should add exchange with embedding and index', () => {
        const session = new SessionMemory(mockBackend)

        session.add({ user: 'test query', assistant: 'test response' })

        expect(session.exchanges.length).toBe(1)
        expect(session.exchanges[0].user).toBe('test query')
        expect(session.exchanges[0].assistant).toBe('test response')
        expect(session.exchanges[0].embedding).toBeDefined()
        expect(session.exchanges[0].index).toBe(0)
        expect(session.exchanges[0].timestamp).toBeDefined()
        expect(mockBackend.textToOrderedState).toHaveBeenCalledWith('test query')
      })

      it('should increment index for multiple exchanges', () => {
        const session = new SessionMemory(mockBackend)

        session.add({ user: 'q1', assistant: 'r1' })
        session.add({ user: 'q2', assistant: 'r2' })
        session.add({ user: 'q3', assistant: 'r3' })

        expect(session.exchanges[0].index).toBe(0)
        expect(session.exchanges[1].index).toBe(1)
        expect(session.exchanges[2].index).toBe(2)
      })
    })

    describe('findSimilar', () => {
      it('should return empty array when no exchanges', () => {
        const session = new SessionMemory(mockBackend)

        const results = session.findSimilar('test')

        expect(results).toEqual([])
      })

      it('should find similar exchanges', () => {
        // Set up mock to return varying embeddings
        let callCount = 0
        mockBackend.textToOrderedState = vi.fn(() => {
          callCount++
          const values = new Float32Array(16)
          for (let i = 0; i < 16; i++) {
            values[i] = callCount * 0.1
          }
          return { c: values }
        })

        const session = new SessionMemory(mockBackend)
        session.add({ user: 'q1', assistant: 'r1' })
        session.add({ user: 'q2', assistant: 'r2' })
        session.add({ user: 'q3', assistant: 'r3' })

        const results = session.findSimilar('test query', 2)

        expect(results.length).toBe(2)
        expect(results[0].similarity).toBeDefined()
        // Results should be sorted by similarity (descending)
        expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity)
      })

      it('should limit results to topK', () => {
        const session = new SessionMemory(mockBackend)
        for (let i = 0; i < 10; i++) {
          session.add({ user: `q${i}`, assistant: `r${i}` })
        }

        const results = session.findSimilar('test', 3)

        expect(results.length).toBe(3)
      })
    })

    describe('getCount', () => {
      it('should return exchange count', () => {
        const session = new SessionMemory(mockBackend)

        expect(session.getCount()).toBe(0)

        session.add({ user: 'a', assistant: 'b' })
        expect(session.getCount()).toBe(1)

        session.add({ user: 'c', assistant: 'd' })
        expect(session.getCount()).toBe(2)
      })
    })

    describe('clear', () => {
      it('should clear exchanges and index', () => {
        const session = new SessionMemory(mockBackend)
        session.add({ user: 'a', assistant: 'b' })
        session.add({ user: 'c', assistant: 'd' })

        session.clear()

        expect(session.exchanges.length).toBe(0)
        expect(session.index.size).toBe(0)
      })
    })

    describe('toJSON / fromJSON', () => {
      it('should serialize to JSON', () => {
        const session = new SessionMemory(mockBackend)
        session.add({ user: 'test', assistant: 'response' })

        const json = session.toJSON()

        expect(json).toEqual(session.exchanges)
      })

      it('should deserialize from JSON', () => {
        const session = new SessionMemory(mockBackend)
        const data = [{ user: 'q1', assistant: 'r1', embedding: [0.1], index: 0, timestamp: 123 }]

        session.fromJSON(data)

        expect(session.exchanges).toEqual(data)
      })

      it('should handle null/undefined in fromJSON', () => {
        const session = new SessionMemory(mockBackend)
        session.fromJSON(null)
        expect(session.exchanges).toEqual([])
      })
    })
  })

  // ==========================================================================
  // PERSISTENT MEMORY
  // ==========================================================================
  describe('PersistentMemory', () => {
    const testStorePath = path.join(__dirname, 'test-persistent-memory.json')

    afterEach(() => {
      // Clean up test file
      if (fs.existsSync(testStorePath)) {
        fs.unlinkSync(testStorePath)
      }
    })

    describe('constructor', () => {
      it('should initialize with empty data structure', () => {
        const persistent = new PersistentMemory(null)

        expect(persistent.data).toEqual({
          notableExchanges: [],
          summaries: [],
          metadata: {},
        })
      })

      it('should load existing data if file exists', () => {
        // Write test data
        const testData = {
          notableExchanges: [{ user: 'test', assistant: 'resp', reason: 'important' }],
          summaries: [],
          metadata: { key: 'value' },
        }
        fs.mkdirSync(path.dirname(testStorePath), { recursive: true })
        fs.writeFileSync(testStorePath, JSON.stringify(testData))

        const persistent = new PersistentMemory(testStorePath)

        expect(persistent.data.notableExchanges.length).toBe(1)
        expect(persistent.data.metadata.key).toBe('value')
      })
    })

    describe('saveNotable', () => {
      it('should save notable exchange with reason and timestamp', () => {
        const persistent = new PersistentMemory(null)

        persistent.saveNotable(
          { user: 'important question', assistant: 'critical answer' },
          'user-marked',
        )

        expect(persistent.data.notableExchanges.length).toBe(1)
        expect(persistent.data.notableExchanges[0].user).toBe('important question')
        expect(persistent.data.notableExchanges[0].reason).toBe('user-marked')
        expect(persistent.data.notableExchanges[0].savedAt).toBeDefined()
      })

      it('should default reason to user-marked', () => {
        const persistent = new PersistentMemory(null)

        persistent.saveNotable({ user: 'q', assistant: 'a' })

        expect(persistent.data.notableExchanges[0].reason).toBe('user-marked')
      })

      it('should trim to 100 entries max', () => {
        const persistent = new PersistentMemory(null)

        for (let i = 0; i < 110; i++) {
          persistent.saveNotable({ user: `q${i}`, assistant: `a${i}` }, 'test')
        }

        expect(persistent.data.notableExchanges.length).toBe(100)
        // Should keep the most recent
        expect(persistent.data.notableExchanges[99].user).toBe('q109')
      })
    })

    describe('addSummary', () => {
      it('should add summary with timestamp', () => {
        const persistent = new PersistentMemory(null)

        persistent.addSummary({ topic: 'coding', exchanges: 10 })

        expect(persistent.data.summaries.length).toBe(1)
        expect(persistent.data.summaries[0].topic).toBe('coding')
        expect(persistent.data.summaries[0].timestamp).toBeDefined()
      })

      it('should trim to 50 entries max', () => {
        const persistent = new PersistentMemory(null)

        for (let i = 0; i < 60; i++) {
          persistent.addSummary({ index: i })
        }

        expect(persistent.data.summaries.length).toBe(50)
        expect(persistent.data.summaries[49].index).toBe(59)
      })
    })

    describe('getRecentSummaries', () => {
      it('should return last n summaries', () => {
        const persistent = new PersistentMemory(null)
        for (let i = 0; i < 10; i++) {
          persistent.addSummary({ index: i })
        }

        const recent = persistent.getRecentSummaries(3)

        expect(recent.length).toBe(3)
        expect(recent[0].index).toBe(7)
        expect(recent[2].index).toBe(9)
      })

      it('should default to 5', () => {
        const persistent = new PersistentMemory(null)
        for (let i = 0; i < 10; i++) {
          persistent.addSummary({ index: i })
        }

        const recent = persistent.getRecentSummaries()
        expect(recent.length).toBe(5)
      })
    })

    describe('getNotableExchanges', () => {
      it('should return all notable exchanges', () => {
        const persistent = new PersistentMemory(null)
        persistent.saveNotable({ user: 'a', assistant: 'b' }, 'r1')
        persistent.saveNotable({ user: 'c', assistant: 'd' }, 'r2')

        const notable = persistent.getNotableExchanges()

        expect(notable.length).toBe(2)
      })
    })

    describe('metadata', () => {
      it('should set and get metadata', () => {
        const persistent = new PersistentMemory(null)

        persistent.setMetadata('key1', 'value1')
        persistent.setMetadata('key2', { nested: true })

        expect(persistent.getMetadata('key1')).toBe('value1')
        expect(persistent.getMetadata('key2')).toEqual({ nested: true })
        expect(persistent.getMetadata('nonexistent')).toBeUndefined()
      })
    })

    describe('save / load', () => {
      it('should persist data to file', () => {
        const persistent = new PersistentMemory(testStorePath)
        persistent.saveNotable({ user: 'test', assistant: 'data' }, 'persist-test')
        persistent.save()

        // Read file directly
        const savedData = JSON.parse(fs.readFileSync(testStorePath, 'utf-8'))
        expect(savedData.notableExchanges.length).toBe(1)
      })

      it('should create directories if needed', () => {
        const nestedPath = path.join(__dirname, 'nested', 'dir', 'test.json')
        const persistent = new PersistentMemory(nestedPath)
        persistent.setMetadata('test', true)
        persistent.save()

        expect(fs.existsSync(nestedPath)).toBe(true)

        // Clean up
        fs.unlinkSync(nestedPath)
        fs.rmdirSync(path.dirname(nestedPath))
        fs.rmdirSync(path.dirname(path.dirname(nestedPath)))
      })
    })

    describe('clear', () => {
      it('should reset all data', () => {
        const persistent = new PersistentMemory(null)
        persistent.saveNotable({ user: 'a', assistant: 'b' }, 'test')
        persistent.addSummary({ test: true })
        persistent.setMetadata('key', 'value')

        persistent.clear()

        expect(persistent.data.notableExchanges.length).toBe(0)
        expect(persistent.data.summaries.length).toBe(0)
        expect(Object.keys(persistent.data.metadata).length).toBe(0)
      })
    })
  })

  // ==========================================================================
  // CONTEXT MEMORY (INTEGRATION)
  // ==========================================================================
  describe('ContextMemory', () => {
    let mockBackend: ReturnType<typeof createMockBackend>

    beforeEach(() => {
      mockBackend = createMockBackend()
    })

    describe('constructor', () => {
      it('should initialize all memory tiers', () => {
        const ctx = new ContextMemory(mockBackend, {})

        expect(ctx.immediate).toBeDefined()
        expect(ctx.session).toBeDefined()
        expect(ctx.persistent).toBeDefined()
      })

      it('should use custom immediate size', () => {
        const ctx = new ContextMemory(mockBackend, { immediateSize: 5 })

        expect(ctx.immediate.size).toBe(5)
      })
    })

    describe('addExchange', () => {
      it('should add to both immediate and session', () => {
        const ctx = new ContextMemory(mockBackend, {})

        ctx.addExchange({ user: 'test', assistant: 'response' })

        expect(ctx.immediate.buffer.length).toBe(1)
        expect(ctx.session.exchanges.length).toBe(1)
      })
    })

    describe('getImmediateContext', () => {
      it('should return last n exchanges from immediate buffer', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.addExchange({ user: 'c', assistant: 'd' })
        ctx.addExchange({ user: 'e', assistant: 'f' })

        const last2 = ctx.getImmediateContext(2)

        expect(last2.length).toBe(2)
        expect(last2[0].user).toBe('c')
      })
    })

    describe('getRelevantContext', () => {
      it('should combine immediate and similar context', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.addExchange({ user: 'c', assistant: 'd' })
        ctx.addExchange({ user: 'e', assistant: 'f' })

        const context = ctx.getRelevantContext('query', {
          immediateCount: 2,
          similarCount: 3,
        })

        expect(context.immediate).toBeDefined()
        expect(context.similar).toBeDefined()
        expect(context.recentSummaries).toBeDefined()
      })

      it('should filter immediate exchanges from similar results', () => {
        const ctx = new ContextMemory(mockBackend, {})

        // Add exchanges
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.addExchange({ user: 'c', assistant: 'd' })

        const context = ctx.getRelevantContext('test', {
          immediateCount: 2,
          similarCount: 5,
        })

        // Similar should not contain items already in immediate
        const immediateTimestamps = new Set(context.immediate.map((e: any) => e.timestamp))
        for (const sim of context.similar) {
          expect(immediateTimestamps.has((sim as any).timestamp)).toBe(false)
        }
      })
    })

    describe('buildContextMessages', () => {
      it('should build message array for LLM', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'Hello', assistant: 'Hi there' })
        ctx.addExchange({ user: 'How are you?', assistant: 'Great!' })

        const messages = ctx.buildContextMessages('new question')

        expect(messages).toBeDefined()
        // Should contain at least the immediate context as messages
        const userMessages = messages.filter((m: any) => m.role === 'user')
        expect(userMessages.length).toBeGreaterThan(0)
      })

      it('should include system message for similar context', () => {
        // Set up mock to return different embeddings for different calls
        let callCount = 0
        mockBackend.textToOrderedState = vi.fn(() => {
          callCount++
          const values = new Float32Array(16)
          for (let i = 0; i < 16; i++) {
            values[i] = callCount === 1 ? 0.9 : 0.1 // First call gets high values
          }
          return { c: values }
        })

        const ctx = new ContextMemory(mockBackend, {})
        // Add many exchanges to ensure some end up in similar but not immediate
        for (let i = 0; i < 10; i++) {
          ctx.addExchange({ user: `q${i}`, assistant: `a${i}` })
        }

        const messages = ctx.buildContextMessages('test query', {
          immediateCount: 2,
          similarCount: 3,
        })

        expect(messages).toBeDefined()
      })
    })

    describe('markNotable', () => {
      it('should save to persistent memory', () => {
        const ctx = new ContextMemory(mockBackend, {})

        ctx.markNotable({ user: 'important', assistant: 'critical' }, 'key-insight')

        expect(ctx.persistent.data.notableExchanges.length).toBe(1)
        expect(ctx.persistent.data.notableExchanges[0].reason).toBe('key-insight')
      })
    })

    describe('endSession', () => {
      it('should save summary with exchange count', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.addExchange({ user: 'c', assistant: 'd' })

        ctx.endSession({ topic: 'test session' })

        expect(ctx.persistent.data.summaries.length).toBe(1)
        expect(ctx.persistent.data.summaries[0].topic).toBe('test session')
        expect(ctx.persistent.data.summaries[0].exchangeCount).toBe(2)
      })
    })

    describe('getStats', () => {
      it('should return stats from all memory tiers', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.markNotable({ user: 'c', assistant: 'd' }, 'test')

        const stats = ctx.getStats()

        expect(stats.immediateCount).toBe(1)
        expect(stats.sessionCount).toBe(1)
        expect(stats.notableCount).toBe(1)
        expect(stats.summaryCount).toBe(0)
      })
    })

    describe('clearSession', () => {
      it('should clear immediate and session but keep persistent', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.markNotable({ user: 'c', assistant: 'd' }, 'test')

        ctx.clearSession()

        expect(ctx.immediate.buffer.length).toBe(0)
        expect(ctx.session.exchanges.length).toBe(0)
        expect(ctx.persistent.data.notableExchanges.length).toBe(1)
      })
    })

    describe('clearAll', () => {
      it('should clear all memory tiers', () => {
        const ctx = new ContextMemory(mockBackend, {})
        ctx.addExchange({ user: 'a', assistant: 'b' })
        ctx.markNotable({ user: 'c', assistant: 'd' }, 'test')

        ctx.clearAll()

        expect(ctx.immediate.buffer.length).toBe(0)
        expect(ctx.session.exchanges.length).toBe(0)
        expect(ctx.persistent.data.notableExchanges.length).toBe(0)
      })
    })
  })
})
