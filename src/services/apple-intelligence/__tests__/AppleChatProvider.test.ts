import { Platform } from 'react-native'

import { ChatProviderEvent } from '../../providers/types'
import { AppleChatProvider } from '../AppleChatProvider'

// Mock the native module
const mockIsAvailable = jest.fn().mockReturnValue(true)
const mockGenerateStreamingResponse = jest.fn()

jest.mock('../../../../modules/apple-intelligence', () => ({
  isAvailable: () => mockIsAvailable(),
  generateStreamingResponse: (...args: unknown[]) => mockGenerateStreamingResponse(...args),
}))

function createProvider() {
  return new AppleChatProvider({
    type: 'apple',
    url: 'apple://on-device',
    token: '',
  })
}

describe('AppleChatProvider', () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockIsAvailable.mockReturnValue(true)
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true })
  })

  describe('capabilities', () => {
    it('supports chat only', () => {
      const provider = createProvider()
      expect(provider.capabilities.chat).toBe(true)
      expect(provider.capabilities.imageAttachments).toBe(false)
      expect(provider.capabilities.serverSessions).toBe(false)
      expect(provider.capabilities.persistentHistory).toBe(false)
      expect(provider.capabilities.scheduler).toBe(false)
      expect(provider.capabilities.gatewaySnapshot).toBe(false)
    })
  })

  describe('connection', () => {
    it('starts disconnected', () => {
      const provider = createProvider()
      expect(provider.isConnected()).toBe(false)
    })

    it('connects successfully on iOS when available', async () => {
      const provider = createProvider()
      await provider.connect()
      expect(provider.isConnected()).toBe(true)
    })

    it('fails to connect on non-iOS platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true })
      const provider = createProvider()
      await expect(provider.connect()).rejects.toThrow('only available on iOS')
      expect(provider.isConnected()).toBe(false)
    })

    it('fails to connect when Apple Intelligence is unavailable', async () => {
      mockIsAvailable.mockReturnValue(false)
      const provider = createProvider()
      await expect(provider.connect()).rejects.toThrow('not available on this device')
      expect(provider.isConnected()).toBe(false)
    })

    it('disconnects successfully', async () => {
      const provider = createProvider()
      await provider.connect()
      provider.disconnect()
      expect(provider.isConnected()).toBe(false)
    })

    it('notifies listeners on connection state changes', async () => {
      const provider = createProvider()
      const listener = jest.fn()
      provider.onConnectionStateChange(listener)

      await provider.connect()
      expect(listener).toHaveBeenCalledWith(true, false)

      provider.disconnect()
      expect(listener).toHaveBeenCalledWith(false, false)
    })

    it('supports unsubscribing from connection state changes', async () => {
      const provider = createProvider()
      const listener = jest.fn()
      const unsubscribe = provider.onConnectionStateChange(listener)

      unsubscribe()
      await provider.connect()
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('sendMessage', () => {
    it('sends message and streams response via native module', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _systemPrompt: string,
          _messages: string,
          _requestId: string,
          onDelta: (delta: string) => void,
          onComplete: () => void,
        ) => {
          // Simulate streaming: native module sends accumulated text
          onDelta('Hello')
          onDelta('Hello world')
          onComplete()
          return () => {}
        },
      )

      const events: ChatProviderEvent[] = []
      await provider.sendMessage({ message: 'Hi', sessionKey: 'test-session' }, (event) =>
        events.push(event),
      )

      expect(events).toEqual([
        { type: 'lifecycle', phase: 'start' },
        { type: 'delta', delta: 'Hello' },
        { type: 'delta', delta: ' world' },
        { type: 'lifecycle', phase: 'end' },
      ])
    })

    it('throws when not connected', async () => {
      const provider = createProvider()
      await expect(
        provider.sendMessage({ message: 'Hi', sessionKey: 'test' }, () => {}),
      ).rejects.toThrow('not connected')
    })

    it('handles streaming errors', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _systemPrompt: string,
          _messages: string,
          _requestId: string,
          _onDelta: (delta: string) => void,
          _onComplete: () => void,
          onError: (error: string) => void,
        ) => {
          onError('Model generation failed')
          return () => {}
        },
      )

      const events: ChatProviderEvent[] = []
      await expect(
        provider.sendMessage({ message: 'Hi', sessionKey: 'test-session' }, (event) =>
          events.push(event),
        ),
      ).rejects.toThrow('Model generation failed')

      // lifecycle start is emitted, then end after error
      expect(events[0]).toEqual({ type: 'lifecycle', phase: 'start' })
      expect(events[events.length - 1]).toEqual({ type: 'lifecycle', phase: 'end' })
    })

    it('maintains separate sessions', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _systemPrompt: string,
          messagesJson: string,
          _requestId: string,
          onDelta: (delta: string) => void,
          onComplete: () => void,
        ) => {
          const messages = JSON.parse(messagesJson)
          const lastMsg = messages[messages.length - 1].content
          onDelta(`Reply to: ${lastMsg}`)
          onComplete()
          return () => {}
        },
      )

      await provider.sendMessage({ message: 'msg1', sessionKey: 'session-a' }, () => {})
      await provider.sendMessage({ message: 'msg2', sessionKey: 'session-b' }, () => {})

      const historyA = await provider.getChatHistory('session-a')
      const historyB = await provider.getChatHistory('session-b')

      expect(historyA.messages).toHaveLength(2) // user + assistant
      expect(historyB.messages).toHaveLength(2)
      expect(historyA.messages[0].content[0].text).toBe('msg1')
      expect(historyB.messages[0].content[0].text).toBe('msg2')
    })
  })

  describe('getChatHistory', () => {
    it('returns empty history for new session', async () => {
      const provider = createProvider()
      const history = await provider.getChatHistory('new-session')
      expect(history.messages).toEqual([])
    })

    it('returns messages with proper structure', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _s: string,
          _m: string,
          _r: string,
          onDelta: (d: string) => void,
          onComplete: () => void,
        ) => {
          onDelta('response')
          onComplete()
          return () => {}
        },
      )

      await provider.sendMessage({ message: 'test', sessionKey: 'session' }, () => {})

      const history = await provider.getChatHistory('session')
      expect(history.messages[0]).toMatchObject({
        role: 'user',
        content: [{ type: 'text', text: 'test' }],
      })
      expect(history.messages[0].timestamp).toEqual(expect.any(Number))
    })
  })

  describe('resetSession', () => {
    it('clears session history', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _s: string,
          _m: string,
          _r: string,
          onDelta: (d: string) => void,
          onComplete: () => void,
        ) => {
          onDelta('response')
          onComplete()
          return () => {}
        },
      )

      await provider.sendMessage({ message: 'test', sessionKey: 'session' }, () => {})
      await provider.resetSession('session')
      const history = await provider.getChatHistory('session')
      expect(history.messages).toEqual([])
    })
  })

  describe('listSessions', () => {
    it('lists all active sessions', async () => {
      const provider = createProvider()
      await provider.connect()

      mockGenerateStreamingResponse.mockImplementation(
        (
          _s: string,
          _m: string,
          _r: string,
          onDelta: (d: string) => void,
          onComplete: () => void,
        ) => {
          onDelta('r')
          onComplete()
          return () => {}
        },
      )

      await provider.sendMessage({ message: 'a', sessionKey: 'session-1' }, () => {})
      await provider.sendMessage({ message: 'b', sessionKey: 'session-2' }, () => {})

      const result = (await provider.listSessions()) as {
        sessions: { key: string; messageCount: number }[]
      }
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions.map((s) => s.key)).toContain('session-1')
      expect(result.sessions.map((s) => s.key)).toContain('session-2')
    })
  })

  describe('getHealth', () => {
    it('returns healthy when available', async () => {
      const provider = createProvider()
      await provider.connect()
      const health = await provider.getHealth()
      expect(health).toEqual({ status: 'healthy' })
    })

    it('returns unhealthy when not connected', async () => {
      const provider = createProvider()
      const health = await provider.getHealth()
      expect(health).toEqual({ status: 'unhealthy' })
    })
  })
})
