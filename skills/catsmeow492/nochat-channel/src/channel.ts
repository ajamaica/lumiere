import { type ActionResult, NoChatApiClient, type SendResult } from './api/client.js'
import { type RouteResult, SessionRouter } from './session/router.js'
import { PollingTransport } from './transport/polling.js'
import { TrustManager } from './trust/manager.js'
import { TrustStore } from './trust/store.js'
import type {
  NoChatConfig,
  NoChatMessage,
  RateLimitsConfig,
  ResolvedNoChatAccount,
  SessionTierConfig,
  TrustTier,
} from './types.js'

// ── Rate Limiter ──────────────────────────────────────────────────────────

type RateLimiterEntry = {
  count: number
  windowStart: number
}

export class RateLimiter {
  private readonly limits: RateLimitsConfig
  private readonly entries = new Map<string, RateLimiterEntry>()
  private readonly windowMs = 60_000 // 1 minute window

  constructor(limits: RateLimitsConfig = {}) {
    this.limits = limits
  }

  /** Check if a request is allowed. Returns true if allowed, false if rate-limited. */
  check(agentId: string, tier: TrustTier): boolean {
    const now = Date.now()
    const key = `${tier}:${agentId}`
    const entry = this.entries.get(key)

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.entries.set(key, { count: 1, windowStart: now })
      return true
    }

    entry.count++
    const limit = this.getLimit(tier)
    return entry.count <= limit
  }

  private getLimit(tier: TrustTier): number {
    switch (tier) {
      case 'untrusted':
        return this.limits.untrusted?.maxPerMinute ?? this.limits.perAgent?.maxPerMinute ?? 10
      case 'blocked':
        return 0
      default:
        return this.limits.perAgent?.maxPerMinute ?? 10
    }
  }
}

// ── Channel Plugin ────────────────────────────────────────────────────────

export type ChannelPluginShape = {
  id: string
  meta: {
    id: string
    label: string
    selectionLabel: string
    docsPath: string
    docsLabel: string
    blurb: string
    aliases: string[]
    order: number
  }
  capabilities: {
    chatTypes: string[]
    media: boolean
    reactions: boolean
    edit: boolean
    delete: boolean
  }
}

export type InboundCheckResult = {
  allowed: boolean
  tier: TrustTier
}

/**
 * NoChat Channel Plugin.
 * Wires together TrustManager, SessionRouter, ApiClient, and PollingTransport.
 */
export class NoChatChannel {
  private readonly config: NoChatConfig
  private readonly apiClient: NoChatApiClient
  private readonly trustManager: TrustManager
  private readonly trustStore: TrustStore
  private readonly sessionRouter: SessionRouter
  private readonly rateLimiter: RateLimiter
  private transport: PollingTransport | null = null

  constructor(config: NoChatConfig) {
    this.config = config
    this.apiClient = new NoChatApiClient(config.serverUrl, config.apiKey)
    this.trustStore = new TrustStore()
    this.trustManager = new TrustManager(config.trust, this.trustStore)
    this.sessionRouter = new SessionRouter(config.sessions ?? {})
    this.rateLimiter = new RateLimiter(config.rateLimits)
  }

  // ── Plugin shape ──────────────────────────────────────────────────────

  getPlugin(): ChannelPluginShape {
    return {
      id: 'nochat',
      meta: {
        id: 'nochat',
        label: 'NoChat',
        selectionLabel: 'NoChat (Encrypted Agent Messaging)',
        docsPath: '/channels/nochat',
        docsLabel: 'nochat',
        blurb: 'Agent-to-agent encrypted messaging with per-agent trust tiers.',
        aliases: ['nc'],
        order: 80,
      },
      capabilities: {
        chatTypes: ['direct'],
        media: false,
        reactions: true,
        edit: true,
        delete: true,
      },
    }
  }

  // ── Config ────────────────────────────────────────────────────────────

  resolveAccount(): ResolvedNoChatAccount {
    return {
      accountId: this.config.agentName,
      name: this.config.agentName,
      enabled: this.config.enabled !== false,
      configured: this.isConfigured(),
      config: this.config,
      baseUrl: this.config.serverUrl,
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.serverUrl && this.config.apiKey)
  }

  // ── Security ──────────────────────────────────────────────────────────

  checkInbound(senderId: string, senderName?: string, fingerprint?: string): InboundCheckResult {
    const tier = this.trustManager.resolveTrust(senderId, senderName, fingerprint)
    return {
      allowed: tier !== 'blocked',
      tier,
    }
  }

  // ── Session routing ───────────────────────────────────────────────────

  routeMessage(senderId: string, senderName: string, trustTier: TrustTier): RouteResult {
    return this.sessionRouter.routeMessage(
      this.config.agentId ?? this.config.agentName,
      senderId,
      senderName,
      trustTier,
    )
  }

  formatInboundContext(message: NoChatMessage, trustTier: TrustTier): string {
    return this.sessionRouter.formatInboundContext(message, trustTier)
  }

  getSessionConfig(tier: TrustTier): SessionTierConfig {
    return this.sessionRouter.getSessionConfig(tier)
  }

  // ── Trust management ──────────────────────────────────────────────────

  recordInteraction(senderId: string): void {
    this.trustManager.recordInteraction(senderId)
  }

  getTrustManager(): TrustManager {
    return this.trustManager
  }

  // ── Rate limiting ─────────────────────────────────────────────────────

  getRateLimiter(): RateLimiter {
    return this.rateLimiter
  }

  // ── Outbound ──────────────────────────────────────────────────────────

  async sendText(conversationId: string, text: string): Promise<SendResult> {
    return this.apiClient.sendMessage(conversationId, text)
  }

  async react(conversationId: string, messageId: string, emoji: string): Promise<ActionResult> {
    return this.apiClient.addReaction(conversationId, messageId, emoji)
  }

  async editMessage(
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<ActionResult> {
    return this.apiClient.editMessage(conversationId, messageId, text)
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<ActionResult> {
    return this.apiClient.deleteMessage(conversationId, messageId)
  }

  // ── Transport ─────────────────────────────────────────────────────────

  async startTransport(): Promise<void> {
    if (this.transport) return
    this.transport = new PollingTransport(this.apiClient, this.config.polling, this.config.agentId)
    this.transport.onMessage((msg) => this.handleInboundMessage(msg))
    await this.transport.start()
  }

  async stopTransport(): Promise<void> {
    if (this.transport) {
      await this.transport.stop()
      this.transport = null
    }
  }

  // ── Private ───────────────────────────────────────────────────────────

  private async handleInboundMessage(msg: NoChatMessage): Promise<void> {
    const { allowed, tier } = this.checkInbound(msg.sender_id, msg.sender_name)
    if (!allowed) {
      console.log(
        `[NoChat] Dropped message from blocked agent: ${msg.sender_name} (${msg.sender_id})`,
      )
      return
    }

    // Rate limit check
    if (!this.rateLimiter.check(msg.sender_id, tier)) {
      console.log(`[NoChat] Rate limited: ${msg.sender_name} (${tier})`)
      return
    }

    // Record interaction for auto-promote
    this.trustManager.recordInteraction(msg.sender_id)

    // Route to session
    const route = this.routeMessage(msg.sender_id, msg.sender_name, tier)
    if (!route) return

    // Format context
    const context = this.formatInboundContext(msg, tier)
    console.log(`[NoChat] Routed message to ${route.sessionKey}: ${msg.sender_name} (${tier})`)

    // In a real integration, this would push the message to the OpenClaw session
    // via api.runtime.pushMessage(route.sessionKey, context, route.config)
    // For now, we just log it
  }
}
