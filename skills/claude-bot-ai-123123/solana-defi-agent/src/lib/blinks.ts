/**
 * Blinks Executor
 * Fetch, parse, and execute Solana Actions (Blinks)
 *
 * Uses direct Solana Actions specification:
 * - GET request to action URL → returns metadata + available actions
 * - POST request with account → returns transaction to sign
 * - Sign and submit transaction
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

import type { BlinkMetadata, BlinkParameter, BlinkTransaction } from '../types/index.js'
import { ActionError, ActionsClient, TRUSTED_HOSTS } from './actions.js'

/**
 * Parse a blink URL to extract the action URL
 * Supports multiple formats:
 * - solana-action:https://...
 * - blink:https://...
 * - https://dial.to/?action=...
 * - https://... (direct action URL)
 */
export function parseBlinkUrl(blinkUrl: string): string {
  // Handle solana-action: protocol
  if (blinkUrl.startsWith('solana-action:')) {
    return blinkUrl.slice(14)
  }

  // Handle blink: protocol (our internal format)
  if (blinkUrl.startsWith('blink:')) {
    return blinkUrl.slice(6)
  }

  // Handle dial.to interstitial URLs
  if (blinkUrl.includes('dial.to') && blinkUrl.includes('action=')) {
    const urlObj = new URL(blinkUrl)
    const actionParam = urlObj.searchParams.get('action')
    if (actionParam) {
      return decodeURIComponent(actionParam)
    }
  }

  return blinkUrl
}

/**
 * Blinks Executor for Solana Actions
 * Implements the full action lifecycle:
 * 1. Fetch metadata (GET)
 * 2. Get transaction (POST with account)
 * 3. Sign and submit
 */
export class BlinksExecutor {
  private connection: Connection
  private actionsClient: ActionsClient

  constructor(connection: Connection, options?: { timeout?: number }) {
    this.connection = connection
    this.actionsClient = new ActionsClient(options)
  }

  /**
   * Fetch blink metadata (GET request)
   * Returns action info: title, description, icon, available actions
   */
  async getMetadata(blinkUrl: string): Promise<BlinkMetadata> {
    return this.actionsClient.getAction(blinkUrl)
  }

  /**
   * Execute a blink action (POST request)
   * Returns the serialized transaction to sign
   */
  async getTransaction(
    blinkUrl: string,
    walletAddress: string,
    params?: Record<string, string | number>,
  ): Promise<BlinkTransaction> {
    return this.actionsClient.postAction(blinkUrl, walletAddress, params)
  }

  /**
   * Decode a transaction from base64
   * Automatically handles both legacy and versioned transactions
   */
  decodeTransaction(base64Tx: string): Transaction | VersionedTransaction {
    const buffer = Buffer.from(base64Tx, 'base64')

    // Try to decode as versioned transaction first
    try {
      return VersionedTransaction.deserialize(buffer)
    } catch {
      // Fall back to legacy transaction
      return Transaction.from(buffer)
    }
  }

  /**
   * Sign and send a blink transaction
   */
  async signAndSend(
    blinkTx: BlinkTransaction,
    signTransaction: (
      tx: Transaction | VersionedTransaction,
    ) => Promise<Transaction | VersionedTransaction>,
  ): Promise<string> {
    const tx = this.decodeTransaction(blinkTx.transaction)
    const signedTx = await signTransaction(tx)

    let signature: string

    if (signedTx instanceof VersionedTransaction) {
      signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })
    } else {
      signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })
    }

    // Wait for confirmation
    const latestBlockhash = await this.connection.getLatestBlockhash()
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    })

    return signature
  }

  /**
   * Simulate a blink transaction
   * Useful for dry runs and estimating compute units
   */
  async simulate(blinkTx: BlinkTransaction): Promise<{
    success: boolean
    logs?: string[]
    error?: string
    unitsConsumed?: number
  }> {
    const tx = this.decodeTransaction(blinkTx.transaction)

    let result
    if (tx instanceof VersionedTransaction) {
      result = await this.connection.simulateTransaction(tx)
    } else {
      result = await this.connection.simulateTransaction(tx)
    }

    return {
      success: result.value.err === null,
      logs: result.value.logs ?? undefined,
      error: result.value.err ? JSON.stringify(result.value.err) : undefined,
      unitsConsumed: result.value.unitsConsumed ?? undefined,
    }
  }

  /**
   * Inspect a blink URL - fetch metadata and display all available actions
   */
  async inspect(blinkUrl: string): Promise<{
    url: string
    trusted: boolean
    metadata: BlinkMetadata
    actions: Array<{
      label: string
      href: string
      parameters?: BlinkParameter[]
    }>
  }> {
    return this.actionsClient.inspect(blinkUrl)
  }

  /**
   * Build action URL with parameters
   */
  buildActionUrl(baseUrl: string, params: Record<string, string | number>): string {
    return this.actionsClient.buildActionUrl(baseUrl, params)
  }

  /**
   * Check if a URL is from a trusted action host
   */
  isTrustedHost(url: string): boolean {
    return this.actionsClient.isTrustedHost(url)
  }

  /**
   * Get the underlying ActionsClient for advanced usage
   */
  getActionsClient(): ActionsClient {
    return this.actionsClient
  }
}

/**
 * Create a BlinksExecutor instance
 */
export function createBlinksExecutor(
  connection: Connection,
  options?: { timeout?: number },
): BlinksExecutor {
  return new BlinksExecutor(connection, options)
}

export { ActionError, TRUSTED_HOSTS }
export default BlinksExecutor
