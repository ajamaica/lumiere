import AsyncStorage from '@react-native-async-storage/async-storage'

import { buildCacheKey, CachedChatProvider } from '../CachedChatProvider'
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
    serverSessions: false,
    persistentHistory: false,
    scheduler: false,
    gatewaySnapshot: false,
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

    it('delegates getHealth and listSessions', async () => {
      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.getHealth()
      expect(inner.getHealth).toHaveBeenCalled()

      await cached.listSessions()
      expect(inner.listSessions).toHaveBeenCalled()
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
      const raw = await AsyncStorage.getItem(key)
      const cached_messages = JSON.parse(raw!) as ChatHistoryMessage[]

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
      const raw = await AsyncStorage.getItem(key)
      const cached_messages = JSON.parse(raw!) as ChatHistoryMessage[]
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
      const raw = await AsyncStorage.getItem(key)
      expect(JSON.parse(raw!)).toEqual(serverMessages)
    })

    it('falls back to cache when inner provider fails', async () => {
      const cachedMessages = [msg('user', 'cached-q'), msg('assistant', 'cached-a')]

      // Pre-populate cache
      const key = buildCacheKey('srv', 'session-1')
      await AsyncStorage.setItem(key, JSON.stringify(cachedMessages))

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
      await AsyncStorage.setItem(key, JSON.stringify(cachedMessages))

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
      await AsyncStorage.setItem(key, JSON.stringify([msg('user', 'hi')]))

      const inner = createMockProvider()
      const cached = new CachedChatProvider(inner, 'srv')

      await cached.resetSession('session-1')

      expect(inner.resetSession).toHaveBeenCalledWith('session-1')
      expect(await AsyncStorage.getItem(key)).toBeNull()
    })

    it('clears cache even when inner provider throws', async () => {
      const key = buildCacheKey('srv', 'session-1')
      await AsyncStorage.setItem(key, JSON.stringify([msg('user', 'hi')]))

      const inner = createMockProvider({
        resetSession: jest.fn().mockRejectedValue(new Error('fail')),
      })

      const cached = new CachedChatProvider(inner, 'srv')

      await expect(cached.resetSession('session-1')).rejects.toThrow('fail')
      expect(await AsyncStorage.getItem(key)).toBeNull()
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

      const rawA = await AsyncStorage.getItem(buildCacheKey('server-a', 's1'))
      const rawB = await AsyncStorage.getItem(buildCacheKey('server-b', 's1'))

      const msgsA = JSON.parse(rawA!) as ChatHistoryMessage[]
      const msgsB = JSON.parse(rawB!) as ChatHistoryMessage[]

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

      const raw1 = await AsyncStorage.getItem(buildCacheKey('srv', 'session-1'))
      const raw2 = await AsyncStorage.getItem(buildCacheKey('srv', 'session-2'))

      const msgs1 = JSON.parse(raw1!) as ChatHistoryMessage[]
      const msgs2 = JSON.parse(raw2!) as ChatHistoryMessage[]

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
      expect(await AsyncStorage.getItem(key)).toBeNull()
    })
  })
})
