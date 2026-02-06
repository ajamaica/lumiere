import { CACHE_CONFIG } from '../../constants'
import { jotaiStorage } from '../../store'
import { logger } from '../../utils/logger'
import {
  ChatHistoryMessage,
  ChatHistoryResponse,
  ChatProvider,
  ChatProviderEvent,
  HealthStatus,
  ProviderCapabilities,
  SendMessageParams,
} from './types'

const cacheLogger = logger.create('CachedChatProvider')

/**
 * Session metadata stored in the session index.
 */
export interface SessionIndexEntry {
  key: string
  messageCount: number
  lastActivity: number
}

/**
 * Build the AsyncStorage key for a server's session index.
 */
export function buildSessionIndexKey(serverId: string | undefined): string {
  const server = serverId || '_local'
  return `${CACHE_CONFIG.SESSION_INDEX_PREFIX}${server}`
}

/**
 * Read the session index for a server directly from AsyncStorage.
 *
 * This allows the UI to list known sessions without needing a connected
 * provider (e.g. for the Sessions screen).
 */
export async function readSessionIndex(serverId: string | undefined): Promise<SessionIndexEntry[]> {
  try {
    const key = buildSessionIndexKey(serverId)
    const entries = await jotaiStorage.getItem(key, [] as SessionIndexEntry[])
    return entries ?? []
  } catch (error) {
    if (__DEV__) {
      cacheLogger.warn(`Failed to read session index for server "${serverId}"`, error)
    }
    return []
  }
}

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
    const messages = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
    if (!messages || messages.length === 0) return []
    return limit ? messages.slice(-limit) : messages
  } catch (error) {
    if (__DEV__) {
      cacheLogger.warn(`Failed to read cache for session "${sessionKey}"`, error)
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

    // Register this session in the index
    await this.addToSessionIndex(params.sessionKey)

    // Accumulate assistant deltas and images so we can cache the full response
    let assistantText = ''
    const assistantImageUrls: string[] = []

    await this.inner.sendMessage(params, (event) => {
      if (event.type === 'delta' && event.delta) {
        assistantText += event.delta
      }
      if (event.type === 'image' && event.image) {
        assistantImageUrls.push(event.image.url)
      }
      // Forward every event to the caller unchanged
      onEvent(event)
    })

    // Cache the completed assistant response (text and/or images)
    if (assistantText || assistantImageUrls.length > 0) {
      const content: ChatHistoryMessage['content'] = []
      if (assistantText) {
        content.push({ type: 'text', text: assistantText })
      }
      for (const url of assistantImageUrls) {
        content.push({ type: 'image_url', image_url: url })
      }
      const assistantMsg: ChatHistoryMessage = {
        role: 'assistant',
        content,
        timestamp: Date.now(),
      }
      await this.appendToCache(cacheKey, assistantMsg)
    }

    // Update session index with latest message count
    await this.updateSessionIndexCount(params.sessionKey)
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
      await jotaiStorage.removeItem(cacheKey)
      await this.removeFromSessionIndex(sessionKey)
    }
  }

  async listSessions(): Promise<unknown> {
    // For providers with server-side sessions, delegate to the inner provider
    if (this.inner.capabilities.serverSessions) {
      return this.inner.listSessions()
    }

    // For all other providers, return the locally tracked session index
    const entries = await readSessionIndex(this.serverId)
    return {
      sessions: entries.sort((a, b) => b.lastActivity - a.lastActivity),
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return this.inner.getHealth()
  }

  // ── Cache helpers ──────────────────────────────────────────────────

  private async readCache(key: string): Promise<ChatHistoryMessage[]> {
    try {
      const messages = await jotaiStorage.getItem(key, [] as ChatHistoryMessage[])
      return messages ?? []
    } catch (error) {
      if (__DEV__) {
        cacheLogger.warn(`Failed to read cache for key "${key}"`, error)
      }
      return []
    }
  }

  private async writeCache(key: string, messages: ChatHistoryMessage[]): Promise<void> {
    try {
      const trimmed = messages.slice(-CACHE_CONFIG.MAX_CACHED_MESSAGES)
      await jotaiStorage.setItem(key, trimmed)
    } catch (error) {
      // Log in development to help debug storage issues
      if (__DEV__) {
        cacheLogger.warn(`Failed to write cache for key "${key}"`, error)
      }
      // Silently ignore in production (storage full, etc.)
    }
  }

  private async appendToCache(key: string, message: ChatHistoryMessage): Promise<void> {
    const existing = await this.readCache(key)
    existing.push(message)
    await this.writeCache(key, existing)
  }

  // ── Session index helpers ───────────────────────────────────────────

  private async readIndex(): Promise<SessionIndexEntry[]> {
    return readSessionIndex(this.serverId)
  }

  private async writeIndex(entries: SessionIndexEntry[]): Promise<void> {
    try {
      const key = buildSessionIndexKey(this.serverId)
      await jotaiStorage.setItem(key, entries)
    } catch (error) {
      if (__DEV__) {
        cacheLogger.warn('Failed to write session index', error)
      }
    }
  }

  private async addToSessionIndex(sessionKey: string): Promise<void> {
    const entries = await this.readIndex()
    const exists = entries.some((e) => e.key === sessionKey)
    if (!exists) {
      entries.push({
        key: sessionKey,
        messageCount: 0,
        lastActivity: Date.now(),
      })
      await this.writeIndex(entries)
    }
  }

  private async removeFromSessionIndex(sessionKey: string): Promise<void> {
    const entries = await this.readIndex()
    const filtered = entries.filter((e) => e.key !== sessionKey)
    await this.writeIndex(filtered)
  }

  private async updateSessionIndexCount(sessionKey: string): Promise<void> {
    const entries = await this.readIndex()
    const entry = entries.find((e) => e.key === sessionKey)
    if (entry) {
      const cacheKey = buildCacheKey(this.serverId, sessionKey)
      const messages = await this.readCache(cacheKey)
      entry.messageCount = messages.length
      entry.lastActivity = Date.now()
      await this.writeIndex(entries)
    }
  }
}
