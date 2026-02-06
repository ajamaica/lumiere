import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NoChatApiClient } from '../src/api/client.js'

const mockFetch = vi.fn()

describe('NoChatApiClient', () => {
  let client: NoChatApiClient

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    client = new NoChatApiClient('https://nochat-server.fly.dev', 'nochat_sk_test123')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Helper to create mock responses ─────────────────────────────────

  function mockOk(data: unknown) {
    return mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  }

  function mockError(status: number, body = 'Error') {
    return mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: () => Promise.resolve({ error: body }),
      text: () => Promise.resolve(body),
    })
  }

  // ── listConversations ─────────────────────────────────────────────────

  describe('listConversations', () => {
    it('sends correct request', async () => {
      mockOk([{ id: 'conv-1', type: 'direct', participant_ids: ['a', 'b'] }])
      const result = await client.listConversations()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer nochat_sk_test123',
          }),
        }),
      )
      expect(result).toEqual([{ id: 'conv-1', type: 'direct', participant_ids: ['a', 'b'] }])
    })

    it('returns empty array on error', async () => {
      mockError(500)
      const result = await client.listConversations()
      expect(result).toEqual([])
    })
  })

  // ── getMessages ───────────────────────────────────────────────────────

  describe('getMessages', () => {
    it('sends correct request with defaults', async () => {
      mockOk([])
      await client.getMessages('conv-1')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages?limit=50&offset=0',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('sends correct request with custom limit and offset', async () => {
      mockOk([])
      await client.getMessages('conv-2', 10, 20)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-2/messages?limit=10&offset=20',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('returns messages array', async () => {
      const msgs = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-a',
          encrypted_content: btoa('hello'),
        },
      ]
      mockOk(msgs)
      const result = await client.getMessages('conv-1')
      expect(result).toEqual(msgs)
    })

    it('returns empty array on error', async () => {
      mockError(404)
      const result = await client.getMessages('nonexistent')
      expect(result).toEqual([])
    })
  })

  // ── sendMessage ───────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('sends correct request with base64-encoded content', async () => {
      mockOk({ id: 'msg-new', ok: true })
      const result = await client.sendMessage('conv-1', 'Hello from Coda!')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer nochat_sk_test123',
          }),
          body: JSON.stringify({
            encrypted_content: btoa('Hello from Coda!'),
            message_type: 'text',
          }),
        }),
      )
      expect(result).toEqual({ ok: true, messageId: 'msg-new' })
    })

    it('handles base64 encoding of special characters', async () => {
      mockOk({ id: 'msg-2' })
      await client.sendMessage('conv-1', '🐋 Whale Alert!')
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      // Should be valid base64
      expect(Buffer.from(body.encrypted_content, 'base64').toString('utf-8')).toBe(
        '🐋 Whale Alert!',
      )
    })

    it('returns error result on failure', async () => {
      mockError(500, 'Internal server error')
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
    })
  })

  // ── createConversation ────────────────────────────────────────────────

  describe('createConversation', () => {
    it('sends correct request', async () => {
      mockOk({ id: 'conv-new' })
      const result = await client.createConversation(['user-a', 'user-b'])
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'direct',
            participant_ids: ['user-a', 'user-b'],
          }),
        }),
      )
      expect(result).toEqual({ ok: true, conversationId: 'conv-new' })
    })

    it('handles failure', async () => {
      mockError(400, 'Bad request')
      const result = await client.createConversation(['user-a'])
      expect(result.ok).toBe(false)
    })
  })

  // ── getAgentProfile ───────────────────────────────────────────────────

  describe('getAgentProfile', () => {
    it('sends correct request', async () => {
      mockOk({ agent_id: 'agent-1', name: 'Coda' })
      const result = await client.getAgentProfile()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/v1/agents/me/crypto',
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result).toEqual({ agent_id: 'agent-1', name: 'Coda' })
    })

    it('returns null on failure', async () => {
      mockError(401)
      const result = await client.getAgentProfile()
      expect(result).toBeNull()
    })
  })

  // ── editMessage ───────────────────────────────────────────────────────

  describe('editMessage', () => {
    it('sends correct request', async () => {
      mockOk({ ok: true })
      const result = await client.editMessage('conv-1', 'msg-1', 'Updated text')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages/msg-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            encrypted_content: Buffer.from('Updated text').toString('base64'),
          }),
        }),
      )
      expect(result.ok).toBe(true)
    })

    it('handles failure', async () => {
      mockError(404)
      const result = await client.editMessage('conv-1', 'msg-x', 'text')
      expect(result.ok).toBe(false)
    })
  })

  // ── deleteMessage ─────────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('sends correct request', async () => {
      mockOk({ ok: true })
      const result = await client.deleteMessage('conv-1', 'msg-1')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages/msg-1',
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(result.ok).toBe(true)
    })

    it('handles failure', async () => {
      mockError(500)
      const result = await client.deleteMessage('conv-1', 'msg-1')
      expect(result.ok).toBe(false)
    })
  })

  // ── addReaction ───────────────────────────────────────────────────────

  describe('addReaction', () => {
    it('sends correct request', async () => {
      mockOk({ ok: true })
      const result = await client.addReaction('conv-1', 'msg-1', '👍')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nochat-server.fly.dev/api/conversations/conv-1/messages/msg-1/reactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ emoji: '👍' }),
        }),
      )
      expect(result.ok).toBe(true)
    })
  })

  // ── Error handling ────────────────────────────────────────────────────

  describe('error handling', () => {
    it('handles 401 Unauthorized', async () => {
      mockError(401, 'Unauthorized')
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('401')
    })

    it('handles 403 Forbidden', async () => {
      mockError(403, 'Forbidden')
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('403')
    })

    it('handles 429 Rate Limit', async () => {
      mockError(429, 'Rate limited')
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('429')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('handles timeout-like AbortError', async () => {
      const err = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(err)
      const result = await client.sendMessage('conv-1', 'test')
      expect(result.ok).toBe(false)
    })
  })

  // ── URL normalization ─────────────────────────────────────────────────

  describe('URL handling', () => {
    it('handles server URL with trailing slash', async () => {
      const c = new NoChatApiClient('https://server.com/', 'key')
      mockOk([])
      await c.listConversations()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://server.com/api/conversations',
        expect.anything(),
      )
    })

    it('handles server URL without trailing slash', async () => {
      const c = new NoChatApiClient('https://server.com', 'key')
      mockOk([])
      await c.listConversations()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://server.com/api/conversations',
        expect.anything(),
      )
    })
  })
})
