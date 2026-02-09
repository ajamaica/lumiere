import AsyncStorage from '@react-native-async-storage/async-storage'

import { jotaiStorage } from '../../../store'
import {
  buildCacheKey,
  buildSessionIndexKey,
  CachedChatProvider,
  readSessionIndex,
  SessionIndexEntry,
} from '../CachedChatProvider'
import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  SendMessageParams,
} from '../types'

// ── Mock inner provider ──────────────────────────────────────────────

function createMockProvider(overrides: Partial<ChatProvider> = {}): ChatProvider {
  const capabilities: ProviderCapabilities = {
    chat: true,
    imageAttachments: false,
    fileAttachments: false,
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
    skills: false,
  }

  return {
    capabilities,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
    onConnectionStateChange: jest.fn().mockReturnValue(() => {}),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    getChatHistory: jest.fn().mockResolvedValue({ messages: [] }),
    resetSession: jest.fn().mockResolvedValue(undefined),
    listSessions: jest.fn().mockResolvedValue({ sessions: [] }),
    getHealth: jest.fn().mockResolvedValue({ status: 'healthy' } as HealthStatus),
    ...overrides,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function msg(role: 'user' | 'assistant', text: string, ts = Date.now()): ChatHistoryMessage {
  return { role, content: [{ type: 'text', text }], timestamp: ts }
}

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('buildCacheKey', () => {
  it('builds a key from serverId and sessionKey', () => {
    expect(buildCacheKey('server-1', 'agent:main:main')).toBe('chat_cache:server-1:agent:main:main')
  })

  it('falls back to _local when serverId is undefined', () => {
    expect(buildCacheKey(undefined, 'session-x')).toBe('chat_cache:_local:session-x')
  })
})

describe('CachedChatProvider', () => {
  describe('capabilities', () => {
    it('enables persistentHistory on top of the inner provider', () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')
      expect(cached.capabilities.persistentHistory).toBe(true)
      expect(cached.capabilities.chat).toBe(true)
    })
  })

  describe('lifecycle pass-through', () => {
    it('delegates connect / disconnect / isConnected', async () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.connect()
      expect(inner.connect).toHaveBeenCalled()

      cached.disconnect()
      expect(inner.disconnect).toHaveBeenCalled()

      cached.isConnected()
      expect(inner.isConnected).toHaveBeenCalled()
    })

    it('delegates onConnectionStateChange', () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')
      const listener = jest.fn()
      cached.onConnectionStateChange(listener)
      expect(inner.onConnectionStateChange).toHaveBeenCalledWith(listener)
    })

    it('delegates getHealth', async () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.getHealth()
      expect(inner.getHealth).toHaveBeenCalled()
    })

    it('delegates listSessions to inner provider when serverSessions is true', async () => {
      const inner = createMockProvider()
      inner.capabilities.serverSessions = true
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.listSessions()
      expect(inner.listSessions).toHaveBeenCalled()
    })

    it('returns local session index when serverSessions is false', async () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      const result = await cached.listSessions()
      expect(inner.listSessions).not.toHaveBeenCalled()
      expect(result).toEqual({ sessions: [] })
    })
  })

  describe('sendMessage', () => {
    it('caches user and assistant messages', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_params: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'Hello ' })
            onEvent({ type: 'delta', delta: 'world' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-1')
      const events: ChatProviderEvent[] = []

      await cached.sendMessage({ message: 'Hi', sessionKey: 'agent:main:main' }, (e) =>
        events.push(e),
      )

      // Events are forwarded to caller
      expect(events).toEqual([
        { type: 'lifecycle', phase: 'start' },
        { type: 'delta', delta: 'Hello ' },
        { type: 'delta', delta: 'world' },
        { type: 'lifecycle', phase: 'end' },
      ])

      // Cache contains both user + assistant messages
      const key = buildCacheKey('srv-1', 'agent:main:main')
      const cached_messages = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])

      expect(cached_messages).toHaveLength(2)
      expect(cached_messages[0].role).toBe('user')
      expect(cached_messages[0].content[0].text).toBe('Hi')
      expect(cached_messages[1].role).toBe('assistant')
      expect(cached_messages[1].content[0].text).toBe('Hello world')
    })

    it('does not cache assistant message when response is empty', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_params: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-1')
      await cached.sendMessage({ message: 'Hi', sessionKey: 'session-a' }, () => {})

      const key = buildCacheKey('srv-1', 'session-a')
      const cached_messages = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      expect(cached_messages).toHaveLength(1)
      expect(cached_messages[0].role).toBe('user')
    })
  })

  describe('getChatHistory', () => {
    it('returns inner provider history and persists it to cache', async () => {
      const serverMessages = [msg('user', 'Q1'), msg('assistant', 'A1')]
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: serverMessages }),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1')

      expect(result.messages).toEqual(serverMessages)

      // Verify it was written to cache
      const key = buildCacheKey('srv', 'session-1')
      const cachedData = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      expect(cachedData).toEqual(serverMessages)
    })

    it('falls back to cache when inner provider fails', async () => {
      const cachedMessages = [msg('user', 'cached-q'), msg('assistant', 'cached-a')]

      // Pre-populate cache
      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, cachedMessages)

      const inner = createMockProvider({
        getChatHistory: jest.fn().mockRejectedValue(new Error('Network error')),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1')

      expect(result.messages).toEqual(cachedMessages)
    })

    it('returns empty array when both inner provider and cache are empty', async () => {
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockRejectedValue(new Error('offline')),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-empty')

      expect(result.messages).toEqual([])
    })

    it('respects limit when falling back to cache', async () => {
      const cachedMessages = [
        msg('user', 'q1'),
        msg('assistant', 'a1'),
        msg('user', 'q2'),
        msg('assistant', 'a2'),
      ]

      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, cachedMessages)

      const inner = createMockProvider({
        getChatHistory: jest.fn().mockRejectedValue(new Error('offline')),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1', 2)

      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].content[0].text).toBe('q2')
      expect(result.messages[1].content[0].text).toBe('a2')
    })
  })

  describe('resetSession', () => {
    it('clears both inner provider session and local cache', async () => {
      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, [msg('user', 'hi')])

      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.resetSession('session-1')

      expect(inner.resetSession).toHaveBeenCalledWith('session-1')
      const remaining = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      expect(remaining).toEqual([])
    })

    it('clears cache even when inner provider throws', async () => {
      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, [msg('user', 'hi')])

      const inner = createMockProvider({
        resetSession: jest.fn().mockRejectedValue(new Error('fail')),
      })

      const cached = new CachedChatProvider(inner, 'srv')

      await expect(cached.resetSession('session-1')).rejects.toThrow('fail')
      const remaining = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      expect(remaining).toEqual([])
    })
  })

  describe('server-session isolation', () => {
    it('caches messages separately per server', async () => {
      const makeInner = () =>
        createMockProvider({
          sendMessage: jest.fn(
            async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
              onEvent({ type: 'lifecycle', phase: 'start' })
              onEvent({ type: 'delta', delta: 'reply' })
              onEvent({ type: 'lifecycle', phase: 'end' })
            },
          ),
        })

      const cachedA = new CachedChatProvider(makeInner(), 'server-a')
      const cachedB = new CachedChatProvider(makeInner(), 'server-b')

      await cachedA.sendMessage({ message: 'from-a', sessionKey: 's1' }, () => {})
      await cachedB.sendMessage({ message: 'from-b', sessionKey: 's1' }, () => {})

      const msgsA = await jotaiStorage.getItem(
        buildCacheKey('server-a', 's1'),
        [] as ChatHistoryMessage[],
      )
      const msgsB = await jotaiStorage.getItem(
        buildCacheKey('server-b', 's1'),
        [] as ChatHistoryMessage[],
      )

      expect(msgsA[0].content[0].text).toBe('from-a')
      expect(msgsB[0].content[0].text).toBe('from-b')
    })

    it('caches messages separately per session', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'reply' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv')

      await cached.sendMessage({ message: 'msg-s1', sessionKey: 'session-1' }, () => {})
      await cached.sendMessage({ message: 'msg-s2', sessionKey: 'session-2' }, () => {})

      const msgs1 = await jotaiStorage.getItem(
        buildCacheKey('srv', 'session-1'),
        [] as ChatHistoryMessage[],
      )
      const msgs2 = await jotaiStorage.getItem(
        buildCacheKey('srv', 'session-2'),
        [] as ChatHistoryMessage[],
      )

      expect(msgs1[0].content[0].text).toBe('msg-s1')
      expect(msgs2[0].content[0].text).toBe('msg-s2')
    })
  })

  describe('does not cache empty server history', () => {
    it('skips writing when server returns empty messages', async () => {
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: [] } as ChatHistoryResponse),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      await cached.getChatHistory('session-1')

      const key = buildCacheKey('srv', 'session-1')
      const cachedData = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      expect(cachedData).toEqual([])
    })
  })

  describe('non-persistent history providers', () => {
    it('falls back to cache when provider returns empty (simulates app restart)', async () => {
      // Simulate: cache has messages from a previous session
      const cachedMessages = [msg('user', 'cached-q'), msg('assistant', 'cached-a')]
      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, cachedMessages)

      // Inner provider has persistentHistory: false (like Apple Intelligence)
      // and returns empty (simulating app restart where in-memory is lost)
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: [] } as ChatHistoryResponse),
      })
      // Default mock provider has persistentHistory: false

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1')

      // Should fall back to cache instead of returning empty
      expect(result.messages).toEqual(cachedMessages)
    })

    it('respects limit when falling back to cache for non-persistent providers', async () => {
      const cachedMessages = [
        msg('user', 'q1'),
        msg('assistant', 'a1'),
        msg('user', 'q2'),
        msg('assistant', 'a2'),
      ]

      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, cachedMessages)

      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: [] } as ChatHistoryResponse),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1', 2)

      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].content[0].text).toBe('q2')
      expect(result.messages[1].content[0].text).toBe('a2')
    })

    it('returns empty when both cache and provider are empty for non-persistent providers', async () => {
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: [] } as ChatHistoryResponse),
      })

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-empty')

      expect(result.messages).toEqual([])
    })

    it('does NOT fall back to cache for persistent-history providers returning empty', async () => {
      // Simulate: cache has stale messages
      const cachedMessages = [msg('user', 'stale-q'), msg('assistant', 'stale-a')]
      const key = buildCacheKey('srv', 'session-1')
      await jotaiStorage.setItem(key, cachedMessages)

      // Inner provider has persistentHistory: true (like Molt)
      // Server says session is empty - we should trust it
      const inner = createMockProvider({
        getChatHistory: jest.fn().mockResolvedValue({ messages: [] } as ChatHistoryResponse),
      })
      inner.capabilities.persistentHistory = true

      const cached = new CachedChatProvider(inner, 'srv')
      const result = await cached.getChatHistory('session-1')

      // Should return empty, trusting the server's authoritative response
      expect(result.messages).toEqual([])
    })
  })

  describe('session index', () => {
    it('registers session in index on first sendMessage', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'reply' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-idx')
      await cached.sendMessage({ message: 'hello', sessionKey: 'session-a' }, () => {})

      const entries = await readSessionIndex('srv-idx')
      expect(entries).toHaveLength(1)
      expect(entries[0].key).toBe('session-a')
      expect(entries[0].messageCount).toBe(2) // user + assistant
      expect(entries[0].lastActivity).toBeGreaterThan(0)
    })

    it('does not duplicate session in index on subsequent messages', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'reply' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-idx')
      await cached.sendMessage({ message: 'msg1', sessionKey: 'session-a' }, () => {})
      await cached.sendMessage({ message: 'msg2', sessionKey: 'session-a' }, () => {})

      const entries = await readSessionIndex('srv-idx')
      expect(entries).toHaveLength(1)
      expect(entries[0].messageCount).toBe(4) // 2 user + 2 assistant
    })

    it('tracks multiple sessions in the index', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'reply' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-idx')
      await cached.sendMessage({ message: 'msg1', sessionKey: 'session-a' }, () => {})
      await cached.sendMessage({ message: 'msg2', sessionKey: 'session-b' }, () => {})

      const entries = await readSessionIndex('srv-idx')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.key).sort()).toEqual(['session-a', 'session-b'])
    })

    it('removes session from index on resetSession', async () => {
      const inner = createMockProvider({
        sendMessage: jest.fn(
          async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
            onEvent({ type: 'lifecycle', phase: 'start' })
            onEvent({ type: 'delta', delta: 'reply' })
            onEvent({ type: 'lifecycle', phase: 'end' })
          },
        ),
      })

      const cached = new CachedChatProvider(inner, 'srv-idx')
      await cached.sendMessage({ message: 'msg', sessionKey: 'session-a' }, () => {})
      await cached.sendMessage({ message: 'msg', sessionKey: 'session-b' }, () => {})

      await cached.resetSession('session-a')

      const entries = await readSessionIndex('srv-idx')
      expect(entries).toHaveLength(1)
      expect(entries[0].key).toBe('session-b')
    })

    it('listSessions returns indexed sessions sorted by lastActivity', async () => {
      // Pre-populate the session index with known timestamps to avoid timing issues
      const indexKey = buildSessionIndexKey('srv-idx')
      const preEntries: SessionIndexEntry[] = [
        { key: 'session-old', messageCount: 2, lastActivity: 1000 },
        { key: 'session-new', messageCount: 2, lastActivity: 2000 },
      ]
      await jotaiStorage.setItem(indexKey, preEntries)

      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv-idx')

      const result = (await cached.listSessions()) as { sessions: SessionIndexEntry[] }
      expect(result.sessions).toHaveLength(2)
      // Most recent first
      expect(result.sessions[0].key).toBe('session-new')
      expect(result.sessions[1].key).toBe('session-old')
    })

    it('isolates session indexes per server', async () => {
      const makeInner = () =>
        createMockProvider({
          sendMessage: jest.fn(
            async (_p: SendMessageParams, onEvent: (e: ChatProviderEvent) => void) => {
              onEvent({ type: 'lifecycle', phase: 'start' })
              onEvent({ type: 'delta', delta: 'reply' })
              onEvent({ type: 'lifecycle', phase: 'end' })
            },
          ),
        })

      const cachedA = new CachedChatProvider(makeInner(), 'server-a')
      const cachedB = new CachedChatProvider(makeInner(), 'server-b')

      await cachedA.sendMessage({ message: 'msg', sessionKey: 'session-1' }, () => {})
      await cachedB.sendMessage({ message: 'msg', sessionKey: 'session-2' }, () => {})

      const entriesA = await readSessionIndex('server-a')
      const entriesB = await readSessionIndex('server-b')

      expect(entriesA).toHaveLength(1)
      expect(entriesA[0].key).toBe('session-1')
      expect(entriesB).toHaveLength(1)
      expect(entriesB[0].key).toBe('session-2')
    })
  })
})

describe('buildSessionIndexKey', () => {
  it('builds a key from serverId', () => {
    expect(buildSessionIndexKey('server-1')).toBe('session_index:server-1')
  })

  it('falls back to _local when serverId is undefined', () => {
    expect(buildSessionIndexKey(undefined)).toBe('session_index:_local')
  })
})

describe('readSessionIndex', () => {
  it('returns empty array when no index exists', async () => {
    const entries = await readSessionIndex('nonexistent')
    expect(entries).toEqual([])
  })

  it('returns stored entries', async () => {
    const storedEntries: SessionIndexEntry[] = [
      { key: 'session-1', messageCount: 5, lastActivity: 1000 },
      { key: 'session-2', messageCount: 3, lastActivity: 2000 },
    ]
    await jotaiStorage.setItem(buildSessionIndexKey('srv'), storedEntries)

    const entries = await readSessionIndex('srv')
    expect(entries).toEqual(storedEntries)
  })
})
