import type { TrustStoreState, TrustTier } from '../types.js'

const DEFAULT_STATE: TrustStoreState = {
  interactionCounts: {},
  runtimeOverrides: {},
  pendingPromotions: {},
}

/**
 * In-memory trust state store with optional file persistence.
 * Tracks interaction counts, runtime overrides, and pending promotions.
 */
export class TrustStore {
  private state: TrustStoreState

  constructor(initialState?: Partial<TrustStoreState>) {
    this.state = {
      ...DEFAULT_STATE,
      interactionCounts: { ...DEFAULT_STATE.interactionCounts, ...initialState?.interactionCounts },
      runtimeOverrides: { ...DEFAULT_STATE.runtimeOverrides, ...initialState?.runtimeOverrides },
      pendingPromotions: { ...DEFAULT_STATE.pendingPromotions, ...initialState?.pendingPromotions },
    }
  }

  /** Get the full state (for serialization) */
  getState(): TrustStoreState {
    return {
      interactionCounts: { ...this.state.interactionCounts },
      runtimeOverrides: { ...this.state.runtimeOverrides },
      pendingPromotions: { ...this.state.pendingPromotions },
    }
  }

  /** Load state from a parsed JSON object */
  loadState(state: TrustStoreState): void {
    this.state = {
      interactionCounts: { ...state.interactionCounts },
      runtimeOverrides: { ...state.runtimeOverrides },
      pendingPromotions: { ...state.pendingPromotions },
    }
  }

  // ── Interaction counts ──────────────────────────────────────────────

  getInteractionCount(agentId: string): number {
    return this.state.interactionCounts[agentId] ?? 0
  }

  incrementInteraction(agentId: string): number {
    const current = this.getInteractionCount(agentId)
    const next = current + 1
    this.state.interactionCounts[agentId] = next
    return next
  }

  // ── Runtime overrides ─────────────────────────────────────────────

  getRuntimeOverrides(): Record<string, TrustTier> {
    return { ...this.state.runtimeOverrides }
  }

  setRuntimeOverride(identifier: string, tier: TrustTier): void {
    this.state.runtimeOverrides[identifier] = tier
  }

  getRuntimeOverride(identifier: string): TrustTier | undefined {
    return this.state.runtimeOverrides[identifier]
  }

  // ── Pending promotions ────────────────────────────────────────────

  setPendingPromotion(agentId: string, targetTier: TrustTier): void {
    this.state.pendingPromotions[agentId] = targetTier
  }

  getPendingPromotion(agentId: string): TrustTier | undefined {
    return this.state.pendingPromotions[agentId]
  }

  clearPendingPromotion(agentId: string): void {
    delete this.state.pendingPromotions[agentId]
  }

  hasPendingPromotion(agentId: string): boolean {
    return agentId in this.state.pendingPromotions
  }

  // ── File persistence ──────────────────────────────────────────────

  /** Load from a JSON file. Returns true if loaded successfully. */
  async loadFromFile(filePath: string): Promise<boolean> {
    try {
      const { readFile } = await import('node:fs/promises')
      const raw = await readFile(filePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        this.loadState({
          interactionCounts: parsed.interactionCounts ?? {},
          runtimeOverrides: parsed.runtimeOverrides ?? {},
          pendingPromotions: parsed.pendingPromotions ?? {},
        })
        return true
      }
      return false
    } catch {
      // File missing or corrupt — start fresh
      return false
    }
  }

  /** Save state to a JSON file */
  async saveToFile(filePath: string): Promise<void> {
    const { writeFile, mkdir } = await import('node:fs/promises')
    const { dirname } = await import('node:path')
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(this.getState(), null, 2), 'utf-8')
  }
}
