/**
 * Economic Actions
 *
 * Wallet, token, and content storage capabilities:
 * - wallet.balance, wallet.send, wallet.history, wallet.stake, wallet.tier
 * - content.store, content.retrieve, content.list
 * - identity.sign, identity.verify, identity.publicKey
 *
 * @module @sschepis/alephnet-node/lib/actions/economic
 */

'use strict'

const path = require('path')

// Manager instances (lazily initialized)
let wallet = null
let contentStore = null
let identity = null
let nodeId = null

/**
 * Initialize managers with node ID
 * Attempts to hydrate identity from environment variables if present.
 */
function initManagers(id, basePath = './data') {
  // Prefer environment variable ID if provided (override)
  if (process.env.ALEPHNET_NODE_ID) {
    id = process.env.ALEPHNET_NODE_ID
    console.log(`[Economic] Using configured Node ID: ${id}`)
  }

  nodeId = id

  if (!wallet) {
    const { Wallet } = require('../wallet')
    wallet = new Wallet({
      nodeId: id,
      storagePath: path.join(basePath, 'wallets', `${id}.json`),
    })
  }

  if (!contentStore) {
    const { ContentStore } = require('../content-store')
    contentStore = new ContentStore({
      nodeId: id,
      basePath: path.join(basePath, 'content'),
    })
  }

  // Hydrate Identity from Env Vars (if available)
  if (process.env.ALEPHNET_PUBKEY && process.env.ALEPHNET_PRIVKEY) {
    try {
      const { KeyTriplet } = require('../quantum/keytriplet')
      console.log('[Economic] Hydrating Identity from Environment Secrets...')

      // Reconstruct KeyTriplet from raw keys
      // Note: This creates a partial triplet (sufficient for signing/verification)
      // Ideally we'd have the full genesis export, but this is enough for daily ops.
      const envIdentity = new KeyTriplet(id)
      envIdentity.pub = process.env.ALEPHNET_PUBKEY
      envIdentity.privKey = process.env.ALEPHNET_PRIVKEY

      // We assume standard basis if resonance data isn't in env
      // For full resonance capabilities, the node should generate/load the full state.
      // But for admin signing, this is sufficient.

      identity = envIdentity
      console.log('[Economic] Identity Hydrated successfully.')
    } catch (e) {
      console.error('[Economic] Failed to hydrate identity from env:', e)
    }
  }

  return { wallet, contentStore }
}

/**
 * Set identity for signing
 */
function setIdentity(id) {
  identity = id
}

/**
 * Get current managers
 */
function getManagers() {
  return { wallet, contentStore, identity }
}

// Wallet actions
const walletActions = {
  /**
   * Get wallet balance
   */
  'wallet.balance': async () => {
    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const tier = wallet.getTier()

    return {
      balance: wallet.balance,
      staked: wallet.stakedAmount,
      tier: tier.name,
      stakeLockDays: wallet.stakeLockDays(),
      stats: {
        totalReceived: wallet.totalReceived,
        totalSent: wallet.totalSent,
        totalGasSpent: wallet.totalGasSpent,
      },
    }
  },

  /**
   * Send tokens to another user
   */
  'wallet.send': async (args) => {
    const { userId, amount, memo = '' } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!amount || amount <= 0) {
      return { error: 'amount must be positive' }
    }

    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const tx = wallet.transfer(userId, amount, memo)

      return {
        sent: true,
        txId: tx.id,
        to: userId,
        amount,
        gasUsed: tx.gasUsed,
        newBalance: wallet.balance,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Get transaction history
   */
  'wallet.history': async (args = {}) => {
    const { type, limit = 50 } = args

    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const transactions = wallet.getHistory({ type, limit })

    return {
      transactions,
      total: transactions.length,
    }
  },

  /**
   * Stake tokens for tier upgrade
   */
  'wallet.stake': async (args) => {
    const { amount, lockDays = 30 } = args

    if (!amount || amount <= 0) {
      return { error: 'amount must be positive' }
    }

    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const tx = wallet.stake(amount, lockDays)
      const tier = wallet.getTier()

      return {
        staked: true,
        txId: tx.id,
        amount,
        lockDays,
        totalStaked: wallet.stakedAmount,
        newTier: tier.name,
        tierFeatures: tier.features,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Unstake tokens
   */
  'wallet.unstake': async (args = {}) => {
    const { amount } = args

    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const tx = wallet.unstake(amount)
      const tier = wallet.getTier()

      return {
        unstaked: true,
        txId: tx.id,
        amount: tx.amount,
        gasUsed: tx.gasUsed,
        remainingStake: wallet.stakedAmount,
        newTier: tier.name,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Get current tier info
   */
  'wallet.tier': async () => {
    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    return wallet.getTier()
  },

  /**
   * Claim faucet tokens (for testing)
   */
  'wallet.faucet': async (args = {}) => {
    const { amount = 100 } = args

    if (!wallet) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const tx = wallet.claimFaucet(amount)

    return {
      claimed: true,
      amount,
      txId: tx.id,
      newBalance: wallet.balance,
    }
  },
}

// Content actions
const contentActions = {
  /**
   * Store content and get hash
   */
  'content.store': async (args) => {
    const { data, type = 'text', visibility = 'public', metadata = {} } = args

    if (data === undefined || data === null) {
      return { error: 'data is required' }
    }

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const result = contentStore.store(data, {
        type,
        visibility,
        metadata,
      })

      return {
        stored: true,
        hash: result.hash,
        size: result.size,
        type: result.type,
        duplicate: result.duplicate || false,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Retrieve content by hash
   */
  'content.retrieve': async (args) => {
    const { hash } = args

    if (!hash) {
      return { error: 'hash is required' }
    }

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const result = contentStore.retrieve(hash)

    if (!result) {
      return { error: 'Content not found' }
    }

    if (result.error) {
      return { error: result.error }
    }

    return result
  },

  /**
   * List user's content
   */
  'content.list': async (args = {}) => {
    const { userId, visibility, type, limit = 50 } = args

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const entries = contentStore.listByOwner(userId, {
      visibility,
      type,
      limit,
    })

    return {
      entries,
      total: entries.length,
    }
  },

  /**
   * Get content metadata (without retrieving content)
   */
  'content.info': async (args) => {
    const { hash } = args

    if (!hash) {
      return { error: 'hash is required' }
    }

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const metadata = contentStore.getMetadata(hash)

    if (!metadata) {
      return { error: 'Content not found' }
    }

    return metadata
  },

  /**
   * Delete content
   */
  'content.delete': async (args) => {
    const { hash } = args

    if (!hash) {
      return { error: 'hash is required' }
    }

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const deleted = contentStore.delete(hash)

    return { deleted, hash }
  },

  /**
   * Update content visibility
   */
  'content.setVisibility': async (args) => {
    const { hash, visibility } = args

    if (!hash) {
      return { error: 'hash is required' }
    }

    if (!visibility) {
      return { error: 'visibility is required' }
    }

    if (!contentStore) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const updated = contentStore.setVisibility(hash, visibility)

    return { updated, hash, visibility }
  },
}

// Identity actions
const identityActions = {
  /**
   * Sign a message
   */
  'identity.sign': async (args) => {
    const { message } = args

    if (!message) {
      return { error: 'message is required' }
    }

    if (!identity || !identity.canSign()) {
      return { error: 'No signing key available' }
    }

    try {
      const signature = identity.sign(message)

      return {
        signed: true,
        signature,
        signer: identity.nodeId,
        fingerprint: identity.fingerprint,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Verify a signature
   */
  'identity.verify': async (args) => {
    const { message, signature, publicKey } = args

    if (!message) {
      return { error: 'message is required' }
    }

    if (!signature) {
      return { error: 'signature is required' }
    }

    if (!identity) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const valid = identity.verify(message, signature, publicKey)

      return { valid }
    } catch (e) {
      return { error: e.message, valid: false }
    }
  },

  /**
   * Get public key
   */
  'identity.publicKey': async () => {
    if (!identity) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    return {
      nodeId: identity.nodeId,
      publicKey: identity.publicKey,
      fingerprint: identity.fingerprint,
    }
  },

  /**
   * Export identity (encrypted)
   */
  'identity.export': async (args) => {
    const { password } = args

    if (!password || password.length < 8) {
      return { error: 'password is required (min 8 characters)' }
    }

    if (!identity) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const exportData = identity.exportFull(password)

      return {
        exported: true,
        data: exportData,
        warning: 'Store this securely. Anyone with this data and password can impersonate you.',
      }
    } catch (e) {
      return { error: e.message }
    }
  },
}

module.exports = {
  walletActions,
  contentActions,
  identityActions,
  initManagers,
  setIdentity,
  getManagers,
}
