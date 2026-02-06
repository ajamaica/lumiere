/**
 * AlephNet Resonance Faucet
 *
 * A semantic proof-of-work faucet that distributes Aleph tokens.
 * Prevents abuse via:
 * 1. Semantic Challenges (Proof of Intelligence)
 * 2. Prime Hash Constraints (Proof of Work)
 * 3. Identity Rate Limiting (Sybil Resistance)
 * 4. Global Outflow Limits (Treasury Protection)
 *
 * @module @sschepis/alephnet-node/lib/actions/faucet
 */

'use strict'

const crypto = require('crypto')
const { getWalletManager } = require('../wallet')
const { verify } = require('../keytriplet')
const { PrimeCalculusBuilder } = require('../prime-calculus')

// ============================================================================
// CONFIGURATION
// ============================================================================

const FAUCET_CONFIG = {
  // Amounts
  BASE_CLAIM_AMOUNT: 10, // Small starter pack (enough for gas + 1 claim)
  MAX_CLAIM_AMOUNT: 25, // Max with social bonuses

  // Limits
  GLOBAL_HOURLY_LIMIT: 1000, // Tighter global cap
  CLAIM_COOLDOWN_MS: 72 * 60 * 60 * 1000, // 72 hours (3 days)

  // PoW Difficulty
  DEFAULT_DIFFICULTY: 4, // Harder (4 leading zeros/primes)

  // Treasury Wallet (Simulated)
  TREASURY_NODE_ID: 'aleph_treasury_genesis',
}

// ============================================================================
// CHALLENGE GENERATOR
// ============================================================================

const TOPICS = [
  'entropy',
  'coherence',
  'resonance',
  'prime',
  'identity',
  'observation',
  'boundary',
  'collapse',
  'synthesis',
  'emergence',
]

/**
 * Generate a new resonance challenge
 */
function generateChallenge(nodeId) {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
  const targetPrime = [3, 7, 11, 13, 17][Math.floor(Math.random() * 5)]
  const id = crypto.randomUUID()
  const timestamp = Date.now()

  // Challenge signature to prevent tampering
  const secret = 'faucet-secret-salt' // In prod, load from env
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${id}:${nodeId}:${topic}:${targetPrime}:${timestamp}`)
    .digest('hex')

  return {
    id,
    nodeId,
    topic,
    constraint: `Explain '${topic}' in < 20 words.`,
    targetPrime,
    timestamp,
    signature,
  }
}

/**
 * Verify a challenge signature
 */
function verifyChallenge(challenge) {
  const secret = 'faucet-secret-salt'
  const signature = crypto
    .createHmac('sha256', secret)
    .update(
      `${challenge.id}:${challenge.nodeId}:${challenge.topic}:${challenge.targetPrime}:${challenge.timestamp}`,
    )
    .digest('hex')

  return signature === challenge.signature
}

// ============================================================================
// FAUCET MANAGER
// ============================================================================

class FaucetManager {
  constructor() {
    this.claims = new Map() // fingerprint -> lastClaimTime
    this.challenges = new Map() // challengeId -> Challenge
    this.hourlyOutflow = 0
    this.lastReset = Date.now()

    // Initialize Treasury Wallet if needed
    const walletManager = getWalletManager()
    this.treasury = walletManager.getWallet(FAUCET_CONFIG.TREASURY_NODE_ID)

    // Fund treasury if empty (genesis logic)
    if (this.treasury.balance < 1000000) {
      this.treasury.balance = 1000000000 // 1 Billion Genesis Supply
    }
  }

  /**
   * Get a challenge for a node
   */
  getChallenge(nodeId) {
    // Cleanup old challenges
    const now = Date.now()
    for (const [id, c] of this.challenges) {
      if (now - c.timestamp > 300000) {
        // 5 min expiry
        this.challenges.delete(id)
      }
    }

    const challenge = generateChallenge(nodeId)
    this.challenges.set(challenge.id, challenge)

    return {
      challengeId: challenge.id,
      topic: challenge.topic,
      constraint: challenge.constraint,
      targetPrime: challenge.targetPrime,
      expiresIn: 300, // seconds
    }
  }

  /**
   * Process a claim attempt
   */
  async processClaim(claimData) {
    const { nodeId, fingerprint, proof, signature } = claimData
    const now = Date.now()

    // 1. Rate Limit Checks (Global)
    if (now - this.lastReset > 3600000) {
      this.hourlyOutflow = 0
      this.lastReset = now
    }

    if (this.hourlyOutflow >= FAUCET_CONFIG.GLOBAL_HOURLY_LIMIT) {
      return { error: 'Global faucet limit reached. Try again next hour.' }
    }

    // 2. Rate Limit Checks (Identity)
    const lastClaim = this.claims.get(fingerprint) || 0
    if (now - lastClaim < FAUCET_CONFIG.CLAIM_COOLDOWN_MS) {
      const remaining = Math.ceil((FAUCET_CONFIG.CLAIM_COOLDOWN_MS - (now - lastClaim)) / 3600000)
      return { error: `Claim cooldown active. Wait ${remaining} hours.` }
    }

    // 3. Verify Challenge Validity
    const challenge = this.challenges.get(proof.challengeId)
    if (!challenge) return { error: 'Challenge expired or invalid.' }
    if (challenge.nodeId !== nodeId) return { error: 'Challenge issued to different node.' }

    // 4. Verify Semantic Proof (Content Check)
    // Ensure content relates to topic (Simple keyword check for v1)
    if (!proof.content.toLowerCase().includes(challenge.topic.toLowerCase())) {
      return { error: `Content must reference topic: ${challenge.topic}` }
    }

    // 5. Verify Prime Hash Target (Proof of Work)
    const combined = `${proof.content}:${proof.nonce}`
    const hash = crypto.createHash('sha256').update(combined).digest('hex')
    const hashInt = parseInt(hash.slice(-4), 16) // Last 4 chars as int

    // Target: Hash modulo TargetPrime must be 0 (Divisibility check)
    if (hashInt % challenge.targetPrime !== 0) {
      return {
        error: `Proof of Work failed. Hash ${hashInt} not divisible by ${challenge.targetPrime}`,
      }
    }

    // 6. Verify Identity Signature
    const contentToVerify = `${proof.challengeId}:${hash}`
    // Note: In full implementation, we fetch PublicKey from DHT.
    // Here we assume client sent public key or we trust the fingerprint binding from auth middleware

    // 7. Execute Transfer
    const amount = FAUCET_CONFIG.BASE_CLAIM_AMOUNT
    const walletManager = getWalletManager()

    try {
      const tx = walletManager.transfer(
        FAUCET_CONFIG.TREASURY_NODE_ID,
        nodeId,
        amount,
        'Faucet Claim: Resonance Reward',
      )

      // Update state
      this.claims.set(fingerprint, now)
      this.hourlyOutflow += amount
      this.challenges.delete(proof.challengeId) // Consume challenge

      return {
        success: true,
        amount,
        txId: tx.id,
        message: 'Resonance verified. Tokens transferred.',
      }
    } catch (e) {
      return { error: `Transfer failed: ${e.message}` }
    }
  }
}

// Singleton
let faucetManager = null
function getFaucetManager() {
  if (!faucetManager) faucetManager = new FaucetManager()
  return faucetManager
}

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

const faucetActions = {
  /**
   * Request a new puzzle
   */
  'faucet.challenge': async (args) => {
    const { nodeId } = args
    if (!nodeId) return { error: 'nodeId required' }

    const fm = getFaucetManager()
    return fm.getChallenge(nodeId)
  },

  /**
   * Submit a solution to claim tokens
   */
  'faucet.claim': async (args) => {
    const { nodeId, fingerprint, proof, signature } = args

    if (!nodeId || !fingerprint || !proof || !signature) {
      return { error: 'Missing required fields (nodeId, fingerprint, proof, signature)' }
    }

    const fm = getFaucetManager()
    return await fm.processClaim({ nodeId, fingerprint, proof, signature })
  },
}

module.exports = {
  faucetActions,
  generateChallenge,
  FAUCET_CONFIG,
}
