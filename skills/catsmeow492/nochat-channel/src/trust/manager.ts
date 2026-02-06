import type { TrustConfig, TrustTier } from '../types.js'
import { TRUST_TIER_ORDER, TRUST_TIER_VALUES } from '../types.js'
import type { TrustStore } from './store.js'

export interface TrustListEntry {
  identifier: string
  tier: TrustTier
}

/**
 * Core trust resolution engine.
 * Resolves trust tiers from config + runtime overrides.
 * Manages promotions, demotions, blocking, and auto-promote logic.
 */
export class TrustManager {
  private readonly config: TrustConfig
  private readonly store: TrustStore
  /** Track interaction counts at which an agent was promoted to a tier */
  private promotedAtCount: Map<string, number> = new Map()

  constructor(config: TrustConfig, store: TrustStore) {
    this.config = config
    this.store = store
  }

  // ── Resolution ────────────────────────────────────────────────────────

  /**
   * Resolve trust tier for a sender.
   * Priority: runtime override > fingerprint > user_id > name > default
   */
  resolveTrust(senderId: string, senderName?: string, fingerprint?: string): TrustTier {
    // 1. Check runtime overrides (highest priority after fingerprint-based overrides)
    //    Runtime overrides can be keyed by any identifier
    const overrides = this.store.getRuntimeOverrides()

    // Check fingerprint in runtime overrides
    if (fingerprint && fingerprint in overrides) {
      return overrides[fingerprint]
    }
    // Check senderId in runtime overrides
    if (senderId in overrides) {
      return overrides[senderId]
    }
    // Check senderName in runtime overrides (case-insensitive)
    if (senderName) {
      const nameOverride = this.findOverrideByName(overrides, senderName)
      if (nameOverride !== undefined) return nameOverride
    }

    // 2. Check config: fingerprint > user_id > name
    const agents = this.config.agents

    // Fingerprint match (exact)
    if (fingerprint && fingerprint in agents) {
      return agents[fingerprint]
    }

    // User ID match (exact)
    if (senderId in agents) {
      return agents[senderId]
    }

    // Name match (case-insensitive)
    if (senderName) {
      const nameTier = this.findConfigByName(senderName)
      if (nameTier !== undefined) return nameTier
    }

    // 3. Default
    return this.config.default
  }

  // ── Mutation ──────────────────────────────────────────────────────────

  /** Set trust tier for an identifier (persists as runtime override) */
  setTrust(identifier: string, tier: TrustTier): void {
    this.store.setRuntimeOverride(identifier, tier)
  }

  /** Promote an agent one tier. Never auto-promotes to owner. */
  promoteTrust(identifier: string): TrustTier {
    const current = this.resolveByIdentifier(identifier)
    const currentIdx = TRUST_TIER_ORDER.indexOf(current)
    // Cap at trusted (index 3) — never auto-promote to owner
    const nextIdx = Math.min(currentIdx + 1, TRUST_TIER_ORDER.indexOf('trusted'))
    const next = TRUST_TIER_ORDER[nextIdx]
    this.store.setRuntimeOverride(identifier, next)
    return next
  }

  /** Demote an agent one tier. Stops at blocked. */
  demoteTrust(identifier: string): TrustTier {
    const current = this.resolveByIdentifier(identifier)
    const currentIdx = TRUST_TIER_ORDER.indexOf(current)
    const nextIdx = Math.max(currentIdx - 1, 0)
    const next = TRUST_TIER_ORDER[nextIdx]
    this.store.setRuntimeOverride(identifier, next)
    return next
  }

  /** Block an agent (set to tier 0) */
  blockAgent(identifier: string): void {
    this.store.setRuntimeOverride(identifier, 'blocked')
  }

  // ── Trust list ────────────────────────────────────────────────────────

  /** Get all agents and their resolved tiers */
  getTrustList(): TrustListEntry[] {
    const result = new Map<string, TrustTier>()

    // Config agents first
    for (const [id, tier] of Object.entries(this.config.agents)) {
      result.set(id, tier)
    }

    // Runtime overrides layer on top
    for (const [id, tier] of Object.entries(this.store.getRuntimeOverrides())) {
      result.set(id, tier)
    }

    return Array.from(result.entries()).map(([identifier, tier]) => ({
      identifier,
      tier,
    }))
  }

  // ── Auto-promotion ────────────────────────────────────────────────────

  /**
   * Record an interaction for an agent.
   * May trigger auto-promotion if enabled and thresholds are met.
   */
  recordInteraction(senderId: string): void {
    const count = this.store.incrementInteraction(senderId)
    const autoPromote = this.config.autoPromote

    if (!autoPromote?.enabled) return

    const currentTier = this.resolveByIdentifier(senderId)

    // Blocked agents can't be auto-promoted
    if (currentTier === 'blocked') return

    // Owner can't be promoted further
    if (currentTier === 'owner') return

    // Check untrusted → sandboxed
    if (currentTier === 'untrusted' && autoPromote.untrusted_to_sandboxed) {
      const threshold = autoPromote.untrusted_to_sandboxed.interactions
      if (count >= threshold) {
        this.store.setRuntimeOverride(senderId, 'sandboxed')
        this.promotedAtCount.set(senderId, count)
        console.log(
          `[NoChat] Agent "${senderId}" promoted from untrusted → sandboxed (${count} interactions)`,
        )
      }
    }

    // Check sandboxed → trusted
    if (currentTier === 'sandboxed' && autoPromote.sandboxed_to_trusted) {
      const threshold = autoPromote.sandboxed_to_trusted.interactions
      const promotedAt = this.promotedAtCount.get(senderId) ?? 0
      const interactionsSincePromotion = count - promotedAt

      if (interactionsSincePromotion >= threshold) {
        if (autoPromote.sandboxed_to_trusted.requireApproval) {
          // Flag for manual approval, don't auto-promote
          this.store.setPendingPromotion(senderId, 'trusted')
          console.log(
            `[NoChat] Agent "${senderId}" flagged for promotion to trusted (requires approval)`,
          )
        } else {
          this.store.setRuntimeOverride(senderId, 'trusted')
          console.log(
            `[NoChat] Agent "${senderId}" promoted from sandboxed → trusted (${count} interactions)`,
          )
        }
      }
    }
  }

  /** Check if an agent has a pending auto-promotion that needs approval */
  shouldAutoPromote(senderId: string): boolean {
    return this.store.hasPendingPromotion(senderId)
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /** Resolve trust by a single identifier (could be name, user_id, or fingerprint) */
  private resolveByIdentifier(identifier: string): TrustTier {
    // Check runtime override first
    const override = this.store.getRuntimeOverride(identifier)
    if (override !== undefined) return override

    // Check config by exact key match
    if (identifier in this.config.agents) {
      return this.config.agents[identifier]
    }

    // Check config by case-insensitive name match
    const nameMatch = this.findConfigByName(identifier)
    if (nameMatch !== undefined) return nameMatch

    return this.config.default
  }

  /** Find a config entry by case-insensitive name comparison */
  private findConfigByName(name: string): TrustTier | undefined {
    const lower = name.toLowerCase()
    for (const [key, tier] of Object.entries(this.config.agents)) {
      if (key.toLowerCase() === lower) return tier
    }
    return undefined
  }

  /** Find a runtime override by case-insensitive name comparison */
  private findOverrideByName(
    overrides: Record<string, TrustTier>,
    name: string,
  ): TrustTier | undefined {
    const lower = name.toLowerCase()
    for (const [key, tier] of Object.entries(overrides)) {
      if (key.toLowerCase() === lower) return tier
    }
    return undefined
  }
}
