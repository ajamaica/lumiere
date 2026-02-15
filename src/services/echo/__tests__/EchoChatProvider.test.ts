import { ChatProviderEvent } from '../../providers/types'
import { EchoChatProvider } from '../EchoChatProvider'

function createProvider() {
  return new EchoChatProvider({
    type: 'echo',
    url: '',
    token: '',
  })
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('EchoChatProvider', () => {
  describe('capabilities', () => {
    it('supports chat only', () => {
      const provider = createProvider()
      expect(provider.capabilities.chat).toBe(true)
      expect(provider.capabilities.imageAttachments).toBe(false)
      expect(provider.capabilities.serverSessions).toBe(true)
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

    it('connects successfully', async () => {
      const provider = createProvider()
      await provider.connect()
      expect(provider.isConnected()).toBe(true)
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
    it('echoes the message back after a 2s delay', async () => {
      const provider = createProvider()
      const events: ChatProviderEvent[] = []

      const promise = provider.sendMessage(
        { message: 'Hello world', sessionKey: 'test-session' },
        (event) => events.push(event),
      )

      // start event fires immediately
      expect(events).toEqual([{ type: 'lifecycle', phase: 'start' }])

      jest.advanceTimersByTime(2000)
      await promise

      expect(events).toEqual([
        { type: 'lifecycle', phase: 'start' },
        { type: 'delta', delta: 'Hello world' },
        { type: 'lifecycle', phase: 'end' },
      ])
    })

    it('maintains separate sessions', async () => {
      const provider = createProvider()

      const p1 = provider.sendMessage({ message: 'msg1', sessionKey: 'session-a' }, () => {})
      jest.advanceTimersByTime(2000)
      await p1
      const p2 = provider.sendMessage({ message: 'msg2', sessionKey: 'session-b' }, () => {})
      jest.advanceTimersByTime(2000)
      await p2

      const historyA = await provider.getChatHistory('session-a')
      const historyB = await provider.getChatHistory('session-b')

      expect(historyA.messages).toHaveLength(2) // user + echo
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

    it('respects the limit parameter', async () => {
      const provider = createProvider()
      // Send 3 messages (each creates user + assistant = 6 entries)
      for (let i = 0; i < 3; i++) {
        const p = provider.sendMessage({ message: `msg${i}`, sessionKey: 'session' }, () => {})
        jest.advanceTimersByTime(2000)
        await p
      }

      const history = await provider.getChatHistory('session', 2)
      expect(history.messages).toHaveLength(2)
    })

    it('returns messages with proper structure', async () => {
      const provider = createProvider()
      const p = provider.sendMessage({ message: 'test', sessionKey: 'session' }, () => {})
      jest.advanceTimersByTime(2000)
      await p

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
      const p = provider.sendMessage({ message: 'test', sessionKey: 'session' }, () => {})
      jest.advanceTimersByTime(2000)
      await p

      await provider.resetSession('session')
      const history = await provider.getChatHistory('session')
      expect(history.messages).toEqual([])
    })
  })

  describe('listSessions', () => {
    it('lists all active sessions with metadata', async () => {
      const provider = createProvider()
      const p1 = provider.sendMessage({ message: 'a', sessionKey: 'session-1' }, () => {})
      jest.advanceTimersByTime(2000)
      await p1
      const p2 = provider.sendMessage({ message: 'b', sessionKey: 'session-2' }, () => {})
      jest.advanceTimersByTime(2000)
      await p2

      const result = (await provider.listSessions()) as {
        sessions: { key: string; messageCount: number; lastActivity: number }[]
      }
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions.map((s) => s.key)).toContain('session-1')
      expect(result.sessions.map((s) => s.key)).toContain('session-2')
      // Each session should have lastActivity metadata
      result.sessions.forEach((s) => {
        expect(s.lastActivity).toEqual(expect.any(Number))
        expect(s.messageCount).toBeGreaterThan(0)
      })
    })

    it('returns sessions sorted by lastActivity descending', async () => {
      const provider = createProvider()

      const p1 = provider.sendMessage({ message: 'a', sessionKey: 'session-old' }, () => {})
      jest.advanceTimersByTime(2000)
      await p1

      // Advance time so session-new has a later lastActivity
      jest.advanceTimersByTime(5000)

      const p2 = provider.sendMessage({ message: 'b', sessionKey: 'session-new' }, () => {})
      jest.advanceTimersByTime(2000)
      await p2

      const result = (await provider.listSessions()) as {
        sessions: { key: string; lastActivity: number }[]
      }
      expect(result.sessions[0].key).toBe('session-new')
      expect(result.sessions[1].key).toBe('session-old')
    })

    it('removes session metadata on reset', async () => {
      const provider = createProvider()
      const p = provider.sendMessage({ message: 'a', sessionKey: 'session-1' }, () => {})
      jest.advanceTimersByTime(2000)
      await p

      await provider.resetSession('session-1')
      const result = (await provider.listSessions()) as {
        sessions: { key: string }[]
      }
      expect(result.sessions).toHaveLength(0)
    })
  })

  describe('getHealth', () => {
    it('always returns healthy', async () => {
      const provider = createProvider()
      const health = await provider.getHealth()
      expect(health).toEqual({ status: 'healthy' })
    })
  })
})
