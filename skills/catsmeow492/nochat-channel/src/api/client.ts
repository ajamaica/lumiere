import type { NoChatConversation, NoChatMessage } from '../types.js'

export type SendResult = {
  ok: boolean
  messageId?: string
  error?: string
}

export type CreateConversationResult = {
  ok: boolean
  conversationId?: string
  error?: string
}

export type ActionResult = {
  ok: boolean
  error?: string
}

/**
 * NoChat REST API client.
 * Wraps all NoChat server endpoints with error handling.
 */
export class NoChatApiClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(serverUrl: string, apiKey: string) {
    // Normalize: strip trailing slash
    this.baseUrl = serverUrl.replace(/\/+$/, '')
    this.apiKey = apiKey
  }

  // ── Conversations ─────────────────────────────────────────────────────

  async listConversations(): Promise<NoChatConversation[]> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'GET',
        headers: this.headers(),
      })
      if (!resp.ok) {
        console.log(`[NoChat] listConversations failed: ${resp.status}`)
        return []
      }
      const data = await resp.json()
      // API wraps in { conversations: [...] }
      return (data.conversations ?? data) as NoChatConversation[]
    } catch (err) {
      console.log(`[NoChat] listConversations error: ${(err as Error).message}`)
      return []
    }
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<NoChatMessage[]> {
    try {
      const url = `${this.baseUrl}/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
      const resp = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
      })
      if (!resp.ok) {
        console.log(`[NoChat] getMessages failed: ${resp.status}`)
        return []
      }
      const data = await resp.json()
      // API wraps in { messages: [...] } — handle null/missing gracefully
      const messages = data.messages ?? data
      return Array.isArray(messages) ? messages : ([] as NoChatMessage[])
    } catch (err) {
      console.log(`[NoChat] getMessages error: ${(err as Error).message}`)
      return []
    }
  }

  async createConversation(participantIds: string[]): Promise<CreateConversationResult> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          type: 'direct',
          participant_ids: participantIds,
        }),
      })
      if (!resp.ok) {
        return { ok: false, error: `${resp.status}` }
      }
      const data = (await resp.json()) as { id: string }
      return { ok: true, conversationId: data.id }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  // ── Messages ──────────────────────────────────────────────────────────

  async sendMessage(conversationId: string, text: string): Promise<SendResult> {
    try {
      const encoded = Buffer.from(text, 'utf-8').toString('base64')
      const resp = await fetch(`${this.baseUrl}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          encrypted_content: encoded,
          message_type: 'text',
        }),
      })
      if (!resp.ok) {
        return { ok: false, error: `${resp.status}` }
      }
      const data = (await resp.json()) as { id?: string; ok?: boolean }
      return { ok: true, messageId: data.id }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<ActionResult> {
    try {
      const encoded = Buffer.from(text, 'utf-8').toString('base64')
      const resp = await fetch(
        `${this.baseUrl}/api/conversations/${conversationId}/messages/${messageId}`,
        {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ encrypted_content: encoded }),
        },
      )
      if (!resp.ok) {
        return { ok: false, error: `${resp.status}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<ActionResult> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/api/conversations/${conversationId}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: this.headers(),
        },
      )
      if (!resp.ok) {
        return { ok: false, error: `${resp.status}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async addReaction(
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<ActionResult> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/api/conversations/${conversationId}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ emoji }),
        },
      )
      if (!resp.ok) {
        return { ok: false, error: `${resp.status}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  // ── Profile ───────────────────────────────────────────────────────────

  async getAgentProfile(): Promise<Record<string, unknown> | null> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/agents/me/crypto`, {
        method: 'GET',
        headers: this.headers(),
      })
      if (!resp.ok) return null
      return (await resp.json()) as Record<string, unknown>
    } catch {
      return null
    }
  }

  // ── Private ───────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }
}
