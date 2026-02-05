import AsyncStorage from '@react-native-async-storage/async-storage'

import { CACHE_CONFIG } from '../../constants'
import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  SendMessageParams,
} from './types'

/**
 * Build the AsyncStorage key for a given server + session pair.
 *
 * Format: `chat_cache:<serverId>:<sessionKey>`
 *
 * When no serverId is available (e.g. echo provider without server config) we
 * fall back to `_local` so every provider still gets cache isolation.
 */
export function buildCacheKey(serverId: string | undefined, sessionKey: string): string {
  const server = serverId || '_local'
  return `${CACHE_CONFIG.CACHE_KEY_PREFIX}${server}:${sessionKey}`
}

/**
 * Read cached chat history directly from AsyncStorage without a provider.
 *
 * This allows the UI to show cached messages immediately (before the provider
 * connects), eliminating the loading spinner when a cache exists.
 */
export async function readCachedHistory(
  serverId: string | undefined,
  sessionKey: string,
  limit?: number,
): Promise<ChatHistoryMessage[]> {
  try {
    const key = buildCacheKey(serverId, sessionKey)
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return []
    const messages = JSON.parse(raw) as ChatHistoryMessage[]
    return limit ? messages.slice(-limit) : messages
  } catch (error) {
    if (__DEV__) {
      console.warn(`[readCachedHistory] Failed to read cache for session "${sessionKey}":`, error)
    }
    return []
  }
}

/**
 * Decorator that adds transparent AsyncStorage message caching to any
 * `ChatProvider`.
 *
 * - On `sendMessage` the user and assistant messages are appended to the cache
 *   after the inner provider processes them.
 * - On `getChatHistory` the inner provider is tried first; if it fails (e.g.
 *   the device is offline) the local cache is returned instead.
 * - On `resetSession` both the inner provider and the local cache are cleared.
 *
 * The cache is keyed by `serverId + sessionKey` so different servers and
 * sessions never collide.
 */
export class CachedChatProvider implements ChatProvider {
  get capabilities(): ProviderCapabilities {
    return {
      ...this.inner.capabilities,
      // The cache layer gives every provider persistent history capability
      persistentHistory: true,
    }
  }

  constructor(
    private readonly inner: ChatProvider,
    private readonly serverId: string | undefined,
  ) {}

  // ── Lifecycle (pass-through) ───────────────────────────────────────

  async connect(): Promise<void> {
    return this.inner.connect()
  }

  disconnect(): void {
    this.inner.disconnect()
  }

  isConnected(): boolean {
    return this.inner.isConnected()
  }

  onConnectionStateChange(
    listener: (connected: boolean, reconnecting: boolean) => void,
  ): () => void {
    return this.inner.onConnectionStateChange(listener)
  }

  // ── Chat (with caching) ────────────────────────────────────────────

  async sendMessage(
    params: SendMessageParams,
    onEvent: (event: ChatProviderEvent) => void,
  ): Promise<void> {
    const cacheKey = buildCacheKey(this.serverId, params.sessionKey)

    // Cache the outgoing user message immediately
    const userMsg: ChatHistoryMessage = {
      role: 'user',
      content: [{ type: 'text', text: params.message }],
      timestamp: Date.now(),
    }
    await this.appendToCache(cacheKey, userMsg)

    // Accumulate assistant deltas so we can cache the full response
    let assistantText = ''

    await this.inner.sendMessage(params, (event) => {
      if (event.type === 'delta' && event.delta) {
        assistantText += event.delta
      }
      // Forward every event to the caller unchanged
      onEvent(event)
    })

    // Cache the completed assistant response
    if (assistantText) {
      const assistantMsg: ChatHistoryMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: assistantText }],
        timestamp: Date.now(),
      }
      await this.appendToCache(cacheKey, assistantMsg)
    }
  }

  async getChatHistory(sessionKey: string, limit?: number): Promise<ChatHistoryResponse> {
    const cacheKey = buildCacheKey(this.serverId, sessionKey)

    try {
      // Try fetching from the inner provider first (authoritative source)
      const response = await this.inner.getChatHistory(sessionKey, limit)

      // Persist the server response into the local cache so it's available
      // offline next time.
      if (response.messages.length > 0) {
        await this.writeCache(cacheKey, response.messages)
        return response
      }

      // For providers without persistent history (e.g. Apple Intelligence),
      // the inner provider only has in-memory storage which is lost on app restart.
      // When it returns empty, fall back to the cache which may have messages.
      if (!this.inner.capabilities.persistentHistory) {
        const cached = await this.readCache(cacheKey)
        if (cached.length > 0) {
          const messages = limit ? cached.slice(-limit) : cached
          return { messages }
        }
      }

      return response
    } catch {
      // Inner provider failed (offline / network error) → serve from cache
      const cached = await this.readCache(cacheKey)
      const messages = limit ? cached.slice(-limit) : cached
      return { messages }
    }
  }

  async resetSession(sessionKey: string): Promise<void> {
    const cacheKey = buildCacheKey(this.serverId, sessionKey)

    // Best-effort clear on the inner provider; always clear the cache
    try {
      await this.inner.resetSession(sessionKey)
    } finally {
      await AsyncStorage.removeItem(cacheKey)
    }
  }

  async listSessions(): Promise<unknown> {
    return this.inner.listSessions()
  }

  async getHealth(): Promise<HealthStatus> {
    return this.inner.getHealth()
  }

  // ── Cache helpers ──────────────────────────────────────────────────

  private async readCache(key: string): Promise<ChatHistoryMessage[]> {
    try {
      const raw = await AsyncStorage.getItem(key)
      if (!raw) return []
      return JSON.parse(raw) as ChatHistoryMessage[]
    } catch (error) {
      if (__DEV__) {
        console.warn(`[CachedChatProvider] Failed to read cache for key "${key}":`, error)
      }
      return []
    }
  }

  private async writeCache(key: string, messages: ChatHistoryMessage[]): Promise<void> {
    try {
      const trimmed = messages.slice(-CACHE_CONFIG.MAX_CACHED_MESSAGES)
      await AsyncStorage.setItem(key, JSON.stringify(trimmed))
    } catch (error) {
      // Log in development to help debug storage issues
      if (__DEV__) {
        console.warn(`[CachedChatProvider] Failed to write cache for key "${key}":`, error)
      }
      // Silently ignore in production (storage full, etc.)
    }
  }

  private async appendToCache(key: string, message: ChatHistoryMessage): Promise<void> {
    const existing = await this.readCache(key)
    existing.push(message)
    await this.writeCache(key, existing)
  }
}
