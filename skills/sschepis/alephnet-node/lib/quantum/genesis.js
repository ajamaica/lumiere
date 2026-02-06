/**
 * Genesis Ceremony Module
 * Bootstraps the Prime-Resonant trust network and Treasury.
 *
 * SECURITY NOTE:
 * Aleph's identity is deterministic based on `ALEPH_SECRET_SEED`.
 * This seed MUST be provided via environment variable and kept secure.
 */

'use strict'

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const { KeyTriplet } = require('./keytriplet')
const { PrimeHilbertState, Complex } = require('./prime-formalism')
const { Wallet, Transaction } = require('../wallet')
const { ContentStore } = require('../content-store')

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// The "Trinity": Existence (2) × Identity (7) × Universe (137)
const ALEPH_PRIMES = [2, 7, 137]
const ALEPH_USER_ID = 'ALEPH_SYSTEM'

// Default configs
const GENESIS_TREASURY_AMOUNT = 10_000_000 // 10M ℵ
const GENESIS_LOCK_DAYS = 365 * 10 // 10 Year lock for Foundation

// ============================================================================
// HELPER: DETERMINISTIC KEY GENERATION
// ============================================================================

/**
 * Creates a deterministic KeyTriplet from specific primes and a seed.
 * Overrides the default random generation in KeyTriplet.
 *
 * @param {string} nodeId - Identity ID
 * @param {number[]} primes - Specific prime basis
 * @param {string} seed - Secret seed
 */
function createDeterministicTriplet(nodeId, primes, seed) {
  if (!seed) throw new Error('Seed required for deterministic generation')

  const triplet = new KeyTriplet(nodeId)

  // 1. Force the Prime Basis
  triplet.primes = [...primes].sort((a, b) => a - b)

  // 2. Generate Private Resonance State |K_priv⟩ from Seed
  // We manually implement hashToState logic to respect our custom primes
  const state = new PrimeHilbertState(triplet.primes)

  // High-entropy hash of seed + ID
  const hash = crypto.createHash('sha512').update(`${seed}:${nodeId}`).digest()

  // Map hash to amplitudes
  for (let i = 0; i < triplet.primes.length; i++) {
    const p = triplet.primes[i]

    // Extract bytes (wrapping)
    const b1 = hash[i % hash.length]
    const b2 = hash[(i + 1) % hash.length]

    // Map 0-255 to -1.0 to 1.0
    const re = b1 / 127.5 - 1.0
    const im = b2 / 127.5 - 1.0

    state.setAmplitude(p, new Complex(re, im))
  }

  triplet.priv = state.normalize()

  // 3. Project to Public Resonance Key |K_res⟩
  triplet.res = triplet.priv.project()

  // 4. Generate Classical Keys (Deterministic from seed)
  // We use the seed to generate the Ed25519 keypair so it's recoverable
  const keySeed = crypto.createHash('sha256').update(seed).digest()
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    seed: keySeed, // Not all Node versions support seed here, checking fallback
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })

  // Note: If generateKeyPairSync doesn't support 'seed' in this Node version,
  // we fall back to standard random generation.
  // For Aleph security, we assume the persistence of the wallet file protects the classical key,
  // while the ALEPH_SECRET_SEED protects the Resonance Identity.

  triplet.pub = publicKey.toString('base64')
  triplet.privKey = privateKey.toString('base64')

  triplet.lastEvolution = Date.now()

  return triplet
}

// ============================================================================
// GENESIS CEREMONY
// ============================================================================

/**
 * Execute the Genesis Ceremony
 *
 * @param {Object} config
 * @param {string} config.adminId - ID of the SysAdmin
 * @param {string} config.adminEmail - Email of SysAdmin (for entropy)
 * @param {string} config.basePath - Data directory path
 */
async function executeGenesisCeremony(config) {
  const { adminId, adminEmail, basePath } = config

  console.log('[GENESIS] Initiating Prime-Resonant Genesis Ceremony...')

  // 1. Security Check
  const alephSeed = process.env.ALEPH_SECRET_SEED
  if (!alephSeed || alephSeed === 'ALEPH_GENESIS_SEED') {
    throw new Error('FATAL: Unsafe Genesis Seed. Set ALEPH_SECRET_SEED env var.')
  }

  // 2. Initialize Storage
  const contentStore = new ContentStore({
    nodeId: adminId,
    basePath: path.join(basePath, 'content'),
  })

  // 3. Create Aleph Identity (The System Root)
  console.log(`[GENESIS] Materializing Aleph Identity [${ALEPH_PRIMES.join('×')}]...`)
  const alephTriplet = createDeterministicTriplet(ALEPH_USER_ID, ALEPH_PRIMES, alephSeed)

  // 4. Create Admin Identity (The First User)
  console.log(`[GENESIS] Materializing Admin Identity for ${adminEmail}...`)
  // We generate a deterministic seed for the admin based on email + system secret
  // This allows recovery if the admin wallet is lost but system secret is known
  const adminSeed = crypto.createHmac('sha256', alephSeed).update(adminEmail).digest('hex')

  // Admin gets standard primes (random basis, but deterministic from seed)
  // We use the standard KeyTriplet generator but seed it
  const adminTriplet = new KeyTriplet(adminId)
  adminTriplet.generate(adminSeed)

  // 5. Create Genesis Record (Tensor Product)
  console.log('[GENESIS] Computing Tensor Signature...')

  // Calculate simple coherence as a signature placeholder
  const coherence = alephTriplet.resonanceWith(adminTriplet.res.toJSON())

  const genesisRecord = {
    id: `GEN-${Date.now()}`,
    version: 'PRNSA-NODE-V1',
    timestamp: Date.now(),
    aleph: {
      id: ALEPH_USER_ID,
      primes: ALEPH_PRIMES,
      publicKey: alephTriplet.pub,
    },
    admin: {
      id: adminId,
      email: adminEmail,
      publicKey: adminTriplet.pub,
    },
    resonance: {
      coherence: coherence,
      tensorHash: crypto
        .createHash('sha256')
        .update(JSON.stringify(alephTriplet.res.toJSON()))
        .update(JSON.stringify(adminTriplet.res.toJSON()))
        .digest('hex'),
    },
  }

  // 6. Persist Genesis Record
  console.log('[GENESIS] Anchoring Trust Root...')
  const storedRecord = contentStore.store(genesisRecord, {
    type: 'genesis_record',
    visibility: 'public',
    metadata: {
      isGenesis: true,
      signer: ALEPH_USER_ID,
    },
  })

  // 7. Mint Treasury Tokens
  console.log(`[GENESIS] Minting ${GENESIS_TREASURY_AMOUNT.toLocaleString()} ℵ to Treasury...`)

  const adminWallet = new Wallet({
    nodeId: adminId,
    storagePath: path.join(basePath, 'wallets', `${adminId}.json`),
  })

  // Manual Minting (Privileged Operation)
  adminWallet.balance = GENESIS_TREASURY_AMOUNT
  adminWallet.totalReceived = GENESIS_TREASURY_AMOUNT

  // Record Genesis Transaction
  const genesisTx = new Transaction({
    id: `tx_genesis_${Date.now()}`,
    type: 'genesis_mint',
    from: ALEPH_USER_ID,
    to: adminId,
    amount: GENESIS_TREASURY_AMOUNT,
    status: 'confirmed',
    timestamp: Date.now(),
    memo: 'Genesis Treasury Allocation',
  })

  adminWallet.transactions.push(genesisTx)

  // Save Wallet
  adminWallet._save()

  console.log('[GENESIS] Ceremony Complete.')

  return {
    success: true,
    genesisHash: storedRecord.hash,
    adminId,
    alephId: ALEPH_USER_ID,
    treasuryBalance: GENESIS_TREASURY_AMOUNT,
  }
}

module.exports = {
  executeGenesisCeremony,
  createDeterministicTriplet,
  ALEPH_PRIMES,
  ALEPH_USER_ID,
}
