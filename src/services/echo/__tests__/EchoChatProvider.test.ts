import { ChatProviderEvent } from '../../providers/types'
import { EchoChatProvider } from '../EchoChatProvider'

function createProvider() {
  return new EchoChatProvider({
    type: 'echo',
    url: '',
    token: '',
  })
}

describe('EchoChatProvider', () => {
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
    it('echoes the message back', async () => {
      const provider = createProvider()
      const events: ChatProviderEvent[] = []

      await provider.sendMessage({ message: 'Hello world', sessionKey: 'test-session' }, (event) =>
        events.push(event),
      )

      expect(events).toEqual([
        { type: 'lifecycle', phase: 'start' },
        { type: 'delta', delta: 'Hello world' },
        { type: 'lifecycle', phase: 'end' },
      ])
    })

    it('maintains separate sessions', async () => {
      const provider = createProvider()

      await provider.sendMessage({ message: 'msg1', sessionKey: 'session-a' }, () => {})
      await provider.sendMessage({ message: 'msg2', sessionKey: 'session-b' }, () => {})

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
        await provider.sendMessage({ message: `msg${i}`, sessionKey: 'session' }, () => {})
      }

      const history = await provider.getChatHistory('session', 2)
      expect(history.messages).toHaveLength(2)
    })

    it('returns messages with proper structure', async () => {
      const provider = createProvider()
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
      await provider.sendMessage({ message: 'test', sessionKey: 'session' }, () => {})

      await provider.resetSession('session')
      const history = await provider.getChatHistory('session')
      expect(history.messages).toEqual([])
    })
  })

  describe('listSessions', () => {
    it('lists all active sessions', async () => {
      const provider = createProvider()
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
    it('always returns healthy', async () => {
      const provider = createProvider()
      const health = await provider.getHealth()
      expect(health).toEqual({ status: 'healthy' })
    })
  })
})
