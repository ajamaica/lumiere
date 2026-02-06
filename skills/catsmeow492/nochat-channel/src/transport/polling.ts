import type { NoChatApiClient } from '../api/client.js'
import type { InboundMessageHandler, NoChatMessage, PollingConfig } from '../types.js'
import type { NoChatTransport } from './interface.js'

const DEFAULT_INTERVAL = 15000
const DEFAULT_ACTIVE_INTERVAL = 5000
const DEFAULT_IDLE_INTERVAL = 60000
const IDLE_THRESHOLD = 3 // consecutive idle polls before switching to idle interval

/**
 * Polling-based transport for receiving NoChat messages.
 * Adaptive interval: speeds up when active, slows down when idle.
 * On startup, marks all existing messages as seen (no replay of history).
 */
export class PollingTransport implements NoChatTransport {
  private readonly client: NoChatApiClient
  private readonly config: Required<PollingConfig>
  private readonly selfId: string | undefined
  private handlers: InboundMessageHandler[] = []
  private seenMessageIds = new Set<string>()
  private running = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private consecutiveIdlePolls = 0
  private currentInterval: number
  private initialPollDone = false

  constructor(client: NoChatApiClient, config: PollingConfig = {}, selfId?: string) {
    this.client = client
    this.config = {
      intervalMs: config.intervalMs ?? DEFAULT_INTERVAL,
      activeIntervalMs: config.activeIntervalMs ?? DEFAULT_ACTIVE_INTERVAL,
      idleIntervalMs: config.idleIntervalMs ?? DEFAULT_IDLE_INTERVAL,
    }
    this.selfId = selfId
    this.currentInterval = this.config.intervalMs
  }

  onMessage(handler: InboundMessageHandler): void {
    this.handlers.push(handler)
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    // Catch-up: mark all existing messages as seen without dispatching
    // This prevents replaying entire history on every restart
    await this.catchUpExistingMessages()
    this.initialPollDone = true

    console.log(
      `[NoChat] Polling transport started (interval: ${this.currentInterval}ms, caught up ${this.seenMessageIds.size} existing messages)`,
    )
    this.scheduleNext()
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    console.log('[NoChat] Polling transport stopped')
  }

  /** Get the current adaptive polling interval (for testing/monitoring) */
  getCurrentInterval(): number {
    return this.currentInterval
  }

  /**
   * Execute a single poll cycle.
   * Lists conversations, fetches new messages, emits to handlers.
   */
  async poll(): Promise<void> {
    let foundNewMessages = false

    try {
      const conversations = await this.client.listConversations()

      // Process all conversations concurrently
      const results = await Promise.allSettled(
        conversations.map((conv) => this.pollConversation(conv.id)),
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value > 0) {
          foundNewMessages = true
        }
      }
    } catch (err) {
      console.log(`[NoChat] Poll error: ${(err as Error).message}`)
    }

    // Update adaptive interval
    if (foundNewMessages) {
      this.consecutiveIdlePolls = 0
      this.currentInterval = this.config.activeIntervalMs
    } else {
      this.consecutiveIdlePolls++
      if (this.consecutiveIdlePolls >= IDLE_THRESHOLD) {
        this.currentInterval = this.config.idleIntervalMs
      } else {
        this.currentInterval = this.config.intervalMs
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────────────

  /**
   * On startup, fetch all conversations and mark existing messages as seen.
   * This prevents replaying history after a gateway restart.
   */
  private async catchUpExistingMessages(): Promise<void> {
    try {
      const conversations = await this.client.listConversations()
      for (const conv of conversations) {
        try {
          const messages = await this.client.getMessages(conv.id, 50)
          for (const msg of messages) {
            this.seenMessageIds.add(msg.id)
          }
        } catch (err) {
          console.log(`[NoChat] Catch-up error for ${conv.id}: ${(err as Error).message}`)
        }
      }
    } catch (err) {
      console.log(`[NoChat] Catch-up error: ${(err as Error).message}`)
    }
  }

  private async pollConversation(conversationId: string): Promise<number> {
    try {
      const messages = await this.client.getMessages(conversationId, 20)
      let newCount = 0

      for (const msg of messages) {
        // Skip already-seen messages
        if (this.seenMessageIds.has(msg.id)) continue

        // Skip self-messages
        if (this.selfId && msg.sender_id === this.selfId) {
          this.seenMessageIds.add(msg.id)
          continue
        }

        this.seenMessageIds.add(msg.id)
        newCount++

        // Emit to all handlers
        for (const handler of this.handlers) {
          try {
            await handler(msg)
          } catch (err) {
            console.log(`[NoChat] Handler error for message ${msg.id}: ${(err as Error).message}`)
          }
        }
      }

      return newCount
    } catch (err) {
      console.log(`[NoChat] Poll conversation ${conversationId} error: ${(err as Error).message}`)
      return 0
    }
  }

  private scheduleNext(): void {
    if (!this.running) return
    this.timer = setTimeout(async () => {
      if (!this.running) return
      await this.poll()
      this.scheduleNext()
    }, this.currentInterval)
  }
}
