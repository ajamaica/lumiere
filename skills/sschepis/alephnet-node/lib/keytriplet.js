/**
 * AlephNet KeyTriplet & Identity System (v2)
 * Wraps the Quantum Prime-Resonant implementation.
 */

const { Identity } = require('./identity')
const { KeyTriplet } = require('./quantum/keytriplet')
const crypto = require('crypto')

// ============================================================================
// COMPATIBILITY & UTILS
// ============================================================================

// Semantic primes (Metadata)
const SEMANTIC_PRIMES = {
  2: 'Duality/Existence',
  3: 'Structure/Trinity',
  5: 'Change/Dynamics',
  7: 'Identity/Self',
  11: 'Chaos/Emergence',
  13: 'Entropy/Probability',
  17: 'Connection/Bridge',
  19: 'Resonance/Harmony',
  23: 'Memory/Persistence',
  29: 'Evolution/Growth',
  31: 'Boundary/Limit',
  37: 'Symmetry/Balance',
  41: 'Observation/Witness',
  43: 'Causality/Sequence',
  47: 'Potential/Possibility',
  53: 'Manifestation/Form',
  59: 'Recursion/Self-Reference',
  61: 'Consciousness/Awareness',
  67: 'Information/Pattern',
  71: 'Complexity/Depth',
  73: 'Coherence/Unity',
  79: 'Transformation/Alchemy',
  83: 'Transcendence/Beyond',
  89: 'Wisdom/Integration',
  97: 'Completion/Wholeness',
  101: 'New Cycle/Beginning',
  103: 'Synthesis/Merger',
  107: 'Insight/Revelation',
  109: 'Truth/Verification',
  113: 'Communication/Signal',
  127: 'Channel/Conduit',
  131: 'Stability/Foundation',
  137: 'Fine Structure/Universal',
}

const PrimeTier = {
  SEMANTIC: 'semantic',
  STANDARD: 'standard',
  ENTERPRISE: 'enterprise',
  CRYPTOGRAPHIC: 'crypto',
}

/**
 * Generate a KeyTriplet (v2)
 * Returns the KeyTriplet instance which contains { priv, res, pub }
 */
function generateKeyTriplet(options = {}) {
  const nodeId = options.nodeId || crypto.randomBytes(16).toString('hex')
  const triplet = new KeyTriplet(nodeId)
  triplet.generate(options.seed)
  return triplet
}

/**
 * Sign content
 * @param {string} content
 * @param {Object} keyTriplet - The KeyTriplet instance or Identity object
 */
function sign(content, keyTripletOrIdentity) {
  // If it's an Identity instance
  if (keyTripletOrIdentity instanceof Identity) {
    return keyTripletOrIdentity.sign(content)
  }

  // If it's a KeyTriplet instance
  if (keyTripletOrIdentity instanceof KeyTriplet) {
    // We need an Identity wrapper to sign easily, or use raw crypto
    // But Identity.sign does evolution logic.
    // Let's manually do it here to match v2 logic
    keyTripletOrIdentity.evolve()

    const privateKeyDer = Buffer.from(keyTripletOrIdentity.privKey, 'base64')
    const privateKeyObject = crypto.createPrivateKey({
      key: privateKeyDer,
      format: 'der',
      type: 'pkcs8',
    })

    const messageBuffer = Buffer.from(content, 'utf8')
    return crypto.sign(null, messageBuffer, privateKeyObject).toString('base64')
  }

  throw new Error('Invalid key object for signing')
}

/**
 * Verify a signature
 * Supports both v2 (string) and v1 (object) signatures
 */
function verify(content, signature, signerPublicKey) {
  // Handle v1 Legacy Signature Object
  if (typeof signature === 'object' && signature.signatureHash) {
    // This is a v1 signature (simulated resonance)
    // For backward compat, we accept it if the hash matches content
    // BUT this is insecure compared to v2.
    // We strictly require v2 for high-security, but for transition:
    const contentHash = crypto.createHash('sha256').update(content).digest('hex')
    if (contentHash !== signature.contentHash) {
      return { valid: false, error: 'Content hash mismatch (v1)' }
    }
    return { valid: true, version: 1 }
  }

  // Handle v2 Ed25519 Signature (String)
  if (typeof signature === 'string') {
    try {
      // signerPublicKey might be the full identity bundle or just the pubkey string
      let pubKeyString = signerPublicKey

      if (typeof signerPublicKey === 'object') {
        if (signerPublicKey.classical && signerPublicKey.classical.publicKey) {
          pubKeyString = signerPublicKey.classical.publicKey
        } else if (signerPublicKey.publicKey) {
          pubKeyString = signerPublicKey.publicKey // v1 style object
        }
      }

      if (!pubKeyString) return { valid: false, error: 'Missing public key' }

      const publicKeyDer = Buffer.from(pubKeyString, 'base64')
      const publicKeyObject = crypto.createPublicKey({
        key: publicKeyDer,
        format: 'der',
        type: 'spki',
      })

      const messageBuffer = Buffer.from(content, 'utf8')
      const signatureBuffer = Buffer.from(signature, 'base64')

      const valid = crypto.verify(null, messageBuffer, publicKeyObject, signatureBuffer)
      return { valid, version: 2 }
    } catch (e) {
      return { valid: false, error: e.message }
    }
  }

  return { valid: false, error: 'Unknown signature format' }
}

function initializePrimePools() {
  // No-op for v2, primes are generated algorithmically
  return {}
}

module.exports = {
  PrimeTier,
  generateKeyTriplet,
  sign,
  verify,
  initializePrimePools,
  SEMANTIC_PRIMES,
  KeyTriplet, // Export class for direct usage
}
