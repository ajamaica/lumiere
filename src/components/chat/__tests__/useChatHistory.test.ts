/**
 * Tests for the historyToMessages conversion logic in useChatHistory.
 *
 * Since historyToMessages is not exported, we replicate it here as a pure
 * function to verify its behaviour — especially the toolResult handling
 * added in commit b306621.
 */

interface RawHistoryMessage {
  role: string
  content: Array<{ type: string; text?: string }>
  timestamp: number
  toolName?: string
  toolCallId?: string
  isError?: boolean
  details?: Record<string, unknown>
}

interface ConvertedMessage {
  id: string
  type?: string
  text: string
  sender: string
  timestamp: Date
  toolName?: string
  toolCallId?: string
  toolInput?: Record<string, unknown>
  status?: string
}

/** Mirror of the historyToMessages function from useChatHistory.ts */
function historyToMessages(msgs: RawHistoryMessage[], showToolEvents: boolean): ConvertedMessage[] {
  return msgs
    .filter(
      (msg) =>
        msg.role === 'user' ||
        msg.role === 'assistant' ||
        (msg.role === 'toolResult' && showToolEvents),
    )
    .map((msg, index) => {
      if (msg.role === 'toolResult') {
        return {
          id: `history-tool-${msg.timestamp}-${index}`,
          type: 'tool_event' as const,
          toolName: msg.toolName || 'unknown',
          toolCallId: msg.toolCallId || `history-tc-${index}`,
          toolInput: msg.details,
          status: msg.isError ? 'error' : ('completed' as const),
          sender: 'agent' as const,
          timestamp: new Date(msg.timestamp),
          text: msg.toolName || 'unknown',
        }
      }

      const textContent = msg.content.find((c) => c.type === 'text')
      const text = textContent?.text || ''
      if (!text) return null
      return {
        id: `history-${msg.timestamp}-${index}`,
        text,
        sender: msg.role === 'user' ? 'user' : 'agent',
        timestamp: new Date(msg.timestamp),
      } as ConvertedMessage
    })
    .filter((msg): msg is ConvertedMessage => msg !== null)
}

// ---------- tests ----------

describe('historyToMessages', () => {
  const now = Date.now()

  describe('user and assistant messages', () => {
    it('converts user messages correctly', () => {
      const msgs: RawHistoryMessage[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello there' }],
          timestamp: now,
        },
      ]

      const result = historyToMessages(msgs, false)
      expect(result).toHaveLength(1)
      expect(result[0].sender).toBe('user')
      expect(result[0].text).toBe('Hello there')
      expect(result[0].id).toBe(`history-${now}-0`)
      expect(result[0].timestamp).toEqual(new Date(now))
    })

    it('converts assistant messages correctly', () => {
      const msgs: RawHistoryMessage[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi, how can I help?' }],
          timestamp: now,
        },
      ]

      const result = historyToMessages(msgs, false)
      expect(result).toHaveLength(1)
      expect(result[0].sender).toBe('agent')
      expect(result[0].text).toBe('Hi, how can I help?')
    })

    it('filters out messages with empty text content', () => {
      const msgs: RawHistoryMessage[] = [
        {
          role: 'assistant',
          content: [{ type: 'text', text: '' }],
          timestamp: now,
        },
        {
          role: 'assistant',
          content: [{ type: 'image' }], // no text content
          timestamp: now + 1,
        },
      ]

      const result = historyToMessages(msgs, false)
      expect(result).toHaveLength(0)
    })

    it('picks the first text content entry', () => {
      const msgs: RawHistoryMessage[] = [
        {
          role: 'assistant',
          content: [
            { type: 'image' },
            { type: 'text', text: 'Found it' },
            { type: 'text', text: 'Ignored' },
          ],
          timestamp: now,
        },
      ]

      const result = historyToMessages(msgs, false)
      expect(result[0].text).toBe('Found it')
    })

    it('preserves message order', () => {
      const msgs: RawHistoryMessage[] = [
        { role: 'user', content: [{ type: 'text', text: 'First' }], timestamp: now },
        { role: 'assistant', content: [{ type: 'text', text: 'Second' }], timestamp: now + 1 },
        { role: 'user', content: [{ type: 'text', text: 'Third' }], timestamp: now + 2 },
      ]

      const result = historyToMessages(msgs, false)
      expect(result.map((m) => m.text)).toEqual(['First', 'Second', 'Third'])
      expect(result.map((m) => m.sender)).toEqual(['user', 'agent', 'user'])
    })
  })

  describe('toolResult messages', () => {
    const toolResult: RawHistoryMessage = {
      role: 'toolResult',
      content: [],
      timestamp: now,
      toolName: 'web_search',
      toolCallId: 'tc-123',
      isError: false,
      details: { query: 'test query' },
    }

    it('includes toolResult messages when showToolEvents is true', () => {
      const result = historyToMessages([toolResult], true)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('tool_event')
      expect(result[0].toolName).toBe('web_search')
      expect(result[0].toolCallId).toBe('tc-123')
      expect(result[0].toolInput).toEqual({ query: 'test query' })
      expect(result[0].status).toBe('completed')
      expect(result[0].sender).toBe('agent')
      expect(result[0].text).toBe('web_search')
    })

    it('excludes toolResult messages when showToolEvents is false', () => {
      const result = historyToMessages([toolResult], false)
      expect(result).toHaveLength(0)
    })

    it('marks error tool results with error status', () => {
      const errorResult: RawHistoryMessage = {
        ...toolResult,
        isError: true,
      }

      const result = historyToMessages([errorResult], true)
      expect(result[0].status).toBe('error')
    })

    it('defaults toolName to "unknown" when not provided', () => {
      const noName: RawHistoryMessage = {
        role: 'toolResult',
        content: [],
        timestamp: now,
      }

      const result = historyToMessages([noName], true)
      expect(result[0].toolName).toBe('unknown')
      expect(result[0].text).toBe('unknown')
    })

    it('defaults toolCallId when not provided', () => {
      const noCallId: RawHistoryMessage = {
        role: 'toolResult',
        content: [],
        timestamp: now,
        toolName: 'exec',
      }

      const result = historyToMessages([noCallId], true)
      expect(result[0].toolCallId).toBe('history-tc-0')
    })

    it('generates correct IDs for tool results', () => {
      const result = historyToMessages([toolResult], true)
      expect(result[0].id).toBe(`history-tool-${now}-0`)
    })

    it('interleaves tool results with user/assistant messages', () => {
      const msgs: RawHistoryMessage[] = [
        { role: 'user', content: [{ type: 'text', text: 'Search for X' }], timestamp: now },
        {
          role: 'toolResult',
          content: [],
          timestamp: now + 1,
          toolName: 'web_search',
          toolCallId: 'tc-1',
          details: { query: 'X' },
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Here are the results' }],
          timestamp: now + 2,
        },
      ]

      const result = historyToMessages(msgs, true)
      expect(result).toHaveLength(3)
      expect(result[0].sender).toBe('user')
      expect(result[1].type).toBe('tool_event')
      expect(result[2].sender).toBe('agent')
    })
  })

  describe('filtering unknown roles', () => {
    it('filters out messages with unrecognized roles', () => {
      const msgs: RawHistoryMessage[] = [
        { role: 'system', content: [{ type: 'text', text: 'System prompt' }], timestamp: now },
        { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: now + 1 },
      ]

      const result = historyToMessages(msgs, true)
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Hello')
    })
  })

  describe('empty input', () => {
    it('returns empty array for empty input', () => {
      expect(historyToMessages([], false)).toEqual([])
      expect(historyToMessages([], true)).toEqual([])
    })
  })

  describe('index-based deduplication', () => {
    it('generates unique IDs even for same timestamp', () => {
      const msgs: RawHistoryMessage[] = [
        { role: 'user', content: [{ type: 'text', text: 'A' }], timestamp: now },
        { role: 'assistant', content: [{ type: 'text', text: 'B' }], timestamp: now },
      ]

      const result = historyToMessages(msgs, false)
      expect(result[0].id).not.toBe(result[1].id)
    })
  })
})
