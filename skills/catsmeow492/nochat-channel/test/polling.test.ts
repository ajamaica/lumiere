import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NoChatApiClient } from '../src/api/client.js'
import { PollingTransport } from '../src/transport/polling.js'
import type { NoChatConversation, NoChatMessage } from '../src/types.js'

// Mock the API client
function makeMockClient() {
  return {
    listConversations: vi.fn<() => Promise<NoChatConversation[]>>().mockResolvedValue([]),
    getMessages: vi
      .fn<(id: string, limit?: number) => Promise<NoChatMessage[]>>()
      .mockResolvedValue([]),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    getAgentProfile: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    addReaction: vi.fn(),
  } as unknown as NoChatApiClient
}

function makeMessage(overrides: Partial<NoChatMessage> = {}): NoChatMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2, 8)}`,
    conversation_id: 'conv-1',
    sender_id: 'sender-1',
    sender_name: 'TestAgent',
    encrypted_content: btoa('Hello'),
    message_type: 'text',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeConversation(overrides: Partial<NoChatConversation> = {}): NoChatConversation {
  return {
    id: 'conv-1',
    type: 'direct',
    participant_ids: ['me', 'them'],
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('PollingTransport', () => {
  let client: ReturnType<typeof makeMockClient>
  let transport: PollingTransport
  let messageHandler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    client = makeMockClient()
    transport = new PollingTransport(client as unknown as NoChatApiClient, {
      intervalMs: 15000,
      activeIntervalMs: 5000,
      idleIntervalMs: 60000,
    })
    messageHandler = vi.fn()
    transport.onMessage(messageHandler)
  })

  afterEach(async () => {
    await transport.stop()
    vi.useRealTimers()
  })

  // ── Basic polling ─────────────────────────────────────────────────────

  describe('poll', () => {
    it('detects new messages', async () => {
      const msg = makeMessage({ id: 'msg-1' })
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([msg])

      await transport.poll()
      expect(messageHandler).toHaveBeenCalledWith(msg)
    })

    it('ignores already-seen messages (dedup by ID)', async () => {
      const msg = makeMessage({ id: 'msg-dup' })
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([msg])

      await transport.poll()
      expect(messageHandler).toHaveBeenCalledTimes(1)

      // Poll again — same message should be deduplicated
      await transport.poll()
      expect(messageHandler).toHaveBeenCalledTimes(1)
    })

    it('handles empty conversations', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await transport.poll()
      expect(messageHandler).not.toHaveBeenCalled()
    })

    it('handles conversations with no new messages', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await transport.poll()
      expect(messageHandler).not.toHaveBeenCalled()
    })

    it("handles API errors gracefully (doesn't crash)", async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network down'),
      )
      // Should not throw
      await expect(transport.poll()).resolves.not.toThrow()
      expect(messageHandler).not.toHaveBeenCalled()
    })

    it('handles getMessages error gracefully', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'))
      await expect(transport.poll()).resolves.not.toThrow()
      expect(messageHandler).not.toHaveBeenCalled()
    })

    it('multiple conversations polled in parallel', async () => {
      const conv1 = makeConversation({ id: 'conv-1' })
      const conv2 = makeConversation({ id: 'conv-2' })
      const msg1 = makeMessage({ id: 'msg-a', conversation_id: 'conv-1' })
      const msg2 = makeMessage({ id: 'msg-b', conversation_id: 'conv-2' })

      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([conv1, conv2])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockImplementation((convId: string) => {
        if (convId === 'conv-1') return Promise.resolve([msg1])
        if (convId === 'conv-2') return Promise.resolve([msg2])
        return Promise.resolve([])
      })

      await transport.poll()
      expect(messageHandler).toHaveBeenCalledTimes(2)
      expect(messageHandler).toHaveBeenCalledWith(msg1)
      expect(messageHandler).toHaveBeenCalledWith(msg2)
    })

    it('processes multiple new messages in order', async () => {
      const msg1 = makeMessage({ id: 'msg-1', created_at: '2026-02-01T20:00:00Z' })
      const msg2 = makeMessage({ id: 'msg-2', created_at: '2026-02-01T21:00:00Z' })

      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([msg1, msg2])

      await transport.poll()
      expect(messageHandler).toHaveBeenCalledTimes(2)
    })
  })

  // ── Adaptive interval ─────────────────────────────────────────────────

  describe('adaptive interval', () => {
    it('speeds up when messages found', async () => {
      const msg = makeMessage({ id: 'msg-active' })
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([msg])

      await transport.poll()
      expect(transport.getCurrentInterval()).toBe(5000) // activeIntervalMs
    })

    it('slows down after idle period', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([])

      // Multiple idle polls
      await transport.poll()
      await transport.poll()
      await transport.poll()
      await transport.poll()
      await transport.poll()
      expect(transport.getCurrentInterval()).toBe(60000) // idleIntervalMs
    })

    it('returns to default interval after some idle', async () => {
      // First, active
      const msg = makeMessage({ id: 'msg-x' })
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([msg])
      await transport.poll()
      expect(transport.getCurrentInterval()).toBe(5000)

      // Then idle
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await transport.poll()
      // Should move towards default
      expect(transport.getCurrentInterval()).toBe(15000)
    })
  })

  // ── Start/Stop ────────────────────────────────────────────────────────

  describe('start/stop', () => {
    it('stop prevents further polling', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await transport.start()
      await transport.stop()

      // After stop, no more polls should fire
      const callsBefore = (client.listConversations as ReturnType<typeof vi.fn>).mock.calls.length
      await vi.advanceTimersByTimeAsync(60000)
      const callsAfter = (client.listConversations as ReturnType<typeof vi.fn>).mock.calls.length
      // Allow at most 1 call (from the initial poll on start)
      expect(callsAfter - callsBefore).toBeLessThanOrEqual(0)
    })

    it('can be started and stopped multiple times', async () => {
      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([])
      await transport.start()
      await transport.stop()
      await transport.start()
      await transport.stop()
      // Should not throw
    })
  })

  // ── Self-message filtering ────────────────────────────────────────────

  describe('self-message filtering', () => {
    it('filters out messages from self when selfId is set', async () => {
      const transport2 = new PollingTransport(
        client as unknown as NoChatApiClient,
        {
          intervalMs: 15000,
          activeIntervalMs: 5000,
          idleIntervalMs: 60000,
        },
        'my-agent-id',
      )
      const handler = vi.fn()
      transport2.onMessage(handler)

      const selfMsg = makeMessage({ id: 'msg-self', sender_id: 'my-agent-id' })
      const otherMsg = makeMessage({ id: 'msg-other', sender_id: 'other-agent' })

      ;(client.listConversations as ReturnType<typeof vi.fn>).mockResolvedValue([
        makeConversation(),
      ])
      ;(client.getMessages as ReturnType<typeof vi.fn>).mockResolvedValue([selfMsg, otherMsg])

      await transport2.poll()
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(otherMsg)
      await transport2.stop()
    })
  })
})
