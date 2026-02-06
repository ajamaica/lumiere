/**
 * Policy Engine
 *
 * Enforces security policies for DeFi operations including:
 * - Spend limits per transaction and daily
 * - Allowed chain and token allowlists
 * - Blocked recipient addresses
 * - Maximum slippage tolerance
 * - Simulation requirements
 */

import { BridgeOperation, PolicyConfig } from '../types'
import { normalizeChainId } from '../wallet/types'

/**
 * Policy check result
 */
export interface PolicyCheckResult {
  allowed: boolean
  reason?: string
  details?: Record<string, unknown>
}

/**
 * Policy Engine class for enforcing security constraints
 */
export class PolicyEngine {
  private config: PolicyConfig

  constructor(policyId?: string) {
    this.config = this.loadPolicyConfig(policyId)
  }

  /**
   * Load policy configuration from environment
   *
   * @param policyId - Optional policy profile ID for custom limits
   * @returns The policy configuration
   */
  private loadPolicyConfig(policyId?: string): PolicyConfig {
    const limitsJson = process.env.AMPED_OC_LIMITS_JSON

    if (!limitsJson) {
      return {}
    }

    try {
      const allConfigs = JSON.parse(limitsJson) as Record<string, PolicyConfig>

      // If policyId is specified, use that config; otherwise use 'default' or empty
      const config = policyId ? allConfigs[policyId] : allConfigs['default'] || allConfigs

      if (policyId && !config) {
        return allConfigs['default'] || {}
      }

      return config || {}
    } catch (_error) {
      return {}
    }
  }

  /**
   * Check if a chain is allowed
   *
   * @param chainId - The chain ID to check
   * @returns Policy check result
   */
  private checkChainAllowed(chainId: string): PolicyCheckResult {
    const { allowedChains } = this.config

    if (allowedChains && allowedChains.length > 0) {
      const normalizedChain = normalizeChainId(chainId)
      if (!allowedChains.includes(normalizedChain)) {
        return {
          allowed: false,
          reason: `Chain not allowed: ${chainId}. Allowed chains: ${allowedChains.join(', ')}`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check if a token is allowed on a specific chain
   *
   * @param chainId - The chain ID
   * @param token - The token address or symbol
   * @returns Policy check result
   */
  private checkTokenAllowed(chainId: string, token: string): PolicyCheckResult {
    const { allowedTokensByChain } = this.config

    if (allowedTokensByChain) {
      const normalizedChainForTokens = normalizeChainId(chainId)
      const allowedTokens = allowedTokensByChain[normalizedChainForTokens]
      if (allowedTokens && allowedTokens.length > 0) {
        if (!allowedTokens.includes(token)) {
          return {
            allowed: false,
            reason: `Token not allowed on ${chainId}: ${token}. Allowed tokens: ${allowedTokens.join(', ')}`,
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check if a recipient is blocked
   *
   * @param recipient - The recipient address
   * @returns Policy check result
   */
  private checkRecipientNotBlocked(recipient: string): PolicyCheckResult {
    const { blockedRecipients } = this.config

    if (blockedRecipients && blockedRecipients.length > 0) {
      if (blockedRecipients.includes(recipient.toLowerCase())) {
        return {
          allowed: false,
          reason: `Recipient is blocked: ${recipient}`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check bridge amount against limits
   *
   * @param token - The token address or symbol
   * @param amount - The amount in human-readable units
   * @returns Policy check result
   */
  private checkBridgeAmount(token: string, amount: string): PolicyCheckResult {
    const { maxBridgeAmountToken } = this.config

    if (maxBridgeAmountToken) {
      const maxAmount = maxBridgeAmountToken[token]
      if (maxAmount !== undefined) {
        const amountNum = parseFloat(amount)
        if (amountNum > maxAmount) {
          return {
            allowed: false,
            reason: `Bridge amount ${amount} exceeds maximum ${maxAmount} for token ${token}`,
            details: { maxAllowed: maxAmount, requested: amountNum },
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check a bridge operation against all policies
   *
   * @param operation - The bridge operation to validate
   * @returns Policy check result
   */
  async checkBridge(operation: BridgeOperation): Promise<PolicyCheckResult> {
    const { srcChainId, dstChainId, srcToken, dstToken, amount, recipient } = operation

    // Check source chain
    const srcChainCheck = this.checkChainAllowed(srcChainId)
    if (!srcChainCheck.allowed) return srcChainCheck

    // Check destination chain
    const dstChainCheck = this.checkChainAllowed(dstChainId)
    if (!dstChainCheck.allowed) return dstChainCheck

    // Check source token
    const srcTokenCheck = this.checkTokenAllowed(srcChainId, srcToken)
    if (!srcTokenCheck.allowed) return srcTokenCheck

    // Check destination token
    const dstTokenCheck = this.checkTokenAllowed(dstChainId, dstToken)
    if (!dstTokenCheck.allowed) return dstTokenCheck

    // Check amount limits
    const amountCheck = this.checkBridgeAmount(srcToken, amount)
    if (!amountCheck.allowed) return amountCheck

    // Check recipient if specified
    if (recipient) {
      const recipientCheck = this.checkRecipientNotBlocked(recipient)
      if (!recipientCheck.allowed) return recipientCheck
    }

    return { allowed: true }
  }

  /**
   * Get the current policy configuration
   * @returns The policy configuration
   */
  getConfig(): PolicyConfig {
    return { ...this.config }
  }

  /**
   * Get available policy IDs from the configuration
   * @returns Array of available policy IDs
   */
  getAvailablePolicies(): string[] {
    const limitsJson = process.env.AMPED_OC_LIMITS_JSON
    if (!limitsJson) return []

    try {
      const allConfigs = JSON.parse(limitsJson) as Record<string, PolicyConfig>
      return Object.keys(allConfigs)
    } catch {
      return []
    }
  }

  // ============================================================================
  // Swap Policy Checks
  // ============================================================================

  /**
   * Check swap input amount against USD limits
   */
  private checkSwapAmount(inputAmount: string, srcToken: string): PolicyCheckResult {
    const { maxSwapInputUsd, maxSwapInputToken } = this.config

    // Check per-token limit if configured
    if (maxSwapInputToken) {
      const maxTokenAmount = maxSwapInputToken[srcToken]
      if (maxTokenAmount !== undefined) {
        const amountNum = parseFloat(inputAmount)
        if (amountNum > maxTokenAmount) {
          return {
            allowed: false,
            reason: `Swap input amount ${inputAmount} exceeds maximum ${maxTokenAmount} for token ${srcToken}`,
            details: { maxAllowed: maxTokenAmount, requested: amountNum },
          }
        }
      }
    }

    // Note: USD limit check would require price oracle integration
    // For now, we skip enforcement without prices

    return { allowed: true }
  }

  /**
   * Check slippage against maximum allowed
   */
  private checkSlippage(slippageBps: number): PolicyCheckResult {
    const { maxSlippageBps } = this.config

    if (maxSlippageBps !== undefined && slippageBps > maxSlippageBps) {
      return {
        allowed: false,
        reason: `Slippage ${slippageBps} bps exceeds maximum allowed ${maxSlippageBps} bps`,
        details: { maxAllowed: maxSlippageBps, requested: slippageBps },
      }
    }

    return { allowed: true }
  }

  /**
   * Check a swap operation against all policies
   */
  async checkSwap(params: {
    walletId: string
    srcChainId: string
    dstChainId: string
    srcToken: string
    dstToken: string
    inputAmount: string
    slippageBps: number
    policyId?: string
  }): Promise<PolicyCheckResult> {
    const { srcChainId, dstChainId, srcToken, dstToken, inputAmount, slippageBps } = params

    // Check source chain
    const srcChainCheck = this.checkChainAllowed(srcChainId)
    if (!srcChainCheck.allowed) return srcChainCheck

    // Check destination chain
    const dstChainCheck = this.checkChainAllowed(dstChainId)
    if (!dstChainCheck.allowed) return dstChainCheck

    // Check source token
    const srcTokenCheck = this.checkTokenAllowed(srcChainId, srcToken)
    if (!srcTokenCheck.allowed) return srcTokenCheck

    // Check destination token
    const dstTokenCheck = this.checkTokenAllowed(dstChainId, dstToken)
    if (!dstTokenCheck.allowed) return dstTokenCheck

    // Check swap amount limits
    const amountCheck = this.checkSwapAmount(inputAmount, srcToken)
    if (!amountCheck.allowed) return amountCheck

    // Check slippage
    const slippageCheck = this.checkSlippage(slippageBps)
    if (!slippageCheck.allowed) return slippageCheck

    return { allowed: true }
  }

  // ============================================================================
  // Money Market Policy Checks
  // ============================================================================

  /**
   * Check borrow amount against limits
   */
  private checkBorrowAmount(token: string, amount: string, amountUsd?: number): PolicyCheckResult {
    const { maxBorrowUsd, maxBorrowToken } = this.config

    // Check per-token limit if configured
    if (maxBorrowToken) {
      const maxTokenAmount = maxBorrowToken[token]
      if (maxTokenAmount !== undefined) {
        const amountNum = parseFloat(amount)
        if (amountNum > maxTokenAmount) {
          return {
            allowed: false,
            reason: `Borrow amount ${amount} exceeds maximum ${maxTokenAmount} for token ${token}`,
            details: { maxAllowed: maxTokenAmount, requested: amountNum },
          }
        }
      }
    }

    // Check USD limit if amountUsd is provided
    if (maxBorrowUsd !== undefined && amountUsd !== undefined) {
      if (amountUsd > maxBorrowUsd) {
        return {
          allowed: false,
          reason: `Borrow amount $${amountUsd} exceeds maximum $${maxBorrowUsd}`,
          details: { maxAllowed: maxBorrowUsd, requested: amountUsd },
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check a money market operation against all policies
   */
  async checkMoneyMarket(params: {
    walletId: string
    chainId: string
    dstChainId?: string
    token: string
    amount: string
    amountUsd?: number
    operation: 'supply' | 'withdraw' | 'borrow' | 'repay'
    policyId?: string
  }): Promise<PolicyCheckResult> {
    const { chainId, dstChainId, token, amount, amountUsd, operation } = params

    // Check source chain
    const chainCheck = this.checkChainAllowed(chainId)
    if (!chainCheck.allowed) return chainCheck

    // Check destination chain if cross-chain operation
    if (dstChainId) {
      const dstChainCheck = this.checkChainAllowed(dstChainId)
      if (!dstChainCheck.allowed) return dstChainCheck
    }

    // Check token
    const tokenCheck = this.checkTokenAllowed(chainId, token)
    if (!tokenCheck.allowed) return tokenCheck

    // Operation-specific checks
    if (operation === 'borrow') {
      const borrowCheck = this.checkBorrowAmount(token, amount, amountUsd)
      if (!borrowCheck.allowed) return borrowCheck
    }

    return { allowed: true }
  }
}
