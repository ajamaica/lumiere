/**
 * KeyTriplet System
 * Implements the (K_priv, K_pub, K_res) structure for Prime-Resonant Identity.
 */

'use strict'

const crypto = require('crypto')
const { PrimeHilbertState, hashToState, generatePrimes } = require('./prime-formalism')

// Standard crypto for the Classical Public Key part (K_pub)
const { generateKeyPairSync } = require('crypto')

class KeyTriplet {
  constructor(nodeId) {
    this.nodeId = nodeId
    this.priv = null // Private Resonance Key |K_priv⟩
    this.res = null // Public Resonance Key |K_res⟩
    this.pub = null // Classical Public Key (Ed25519)
    this.privKey = null // Classical Private Key (Ed25519) - kept locally

    this.lastEvolution = Date.now()
    this.primes = generatePrimes(64) // Standard basis
  }

  /**
   * Generate a full KeyTriplet from a seed (or random)
   * @param {string} [seed] - Entropy seed
   * @param {string} [networkContext] - Genesis Hash or Network ID to entangle with
   */
  generate(seed = null, networkContext = 'UNIVERSAL_DEFAULT') {
    const generationSeed = seed || crypto.randomBytes(32).toString('hex')

    // ENTANGLEMENT: Mix network context into entropy
    // This ensures identity |Ψ⟩ is unique to this specific Genesis/Network
    const entropySource = `${networkContext}:${generationSeed}:${this.nodeId}`

    // 1. Generate K_priv (Private Resonance Key)
    // H(Network || Seed || ID) -> |Ψ⟩
    this.priv = hashToState(entropySource, this.primes.length)

    // 2. Generate K_res (Public Resonance Key)
    // P(|K_priv⟩) -> |K_res⟩
    // Projection masks exact phases but preserves resonance structure
    this.res = this.priv.project()

    // 3. Generate K_pub (Classical Keys)
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    })

    this.pub = publicKey.toString('base64')
    this.privKey = privateKey.toString('base64')

    this.lastEvolution = Date.now()

    return this
  }

  /**
   * Evolve the Private Resonance Key
   * K_priv(t + dt) = U(dt) K_priv(t)
   */
  evolve() {
    const now = Date.now()
    const dt = (now - this.lastEvolution) / 1000.0 // Seconds
    if (dt <= 0) return

    // Apply Evolution Operator U(dt)
    this.priv = this.priv.evolve(dt)

    // Update Public Resonance Key (it drifts with the private key)
    this.res = this.priv.project()

    this.lastEvolution = now
  }

  /**
   * Get the Public Identity bundle (K_pub, K_res)
   */
  getPublicIdentity() {
    // Ensure state is up to date
    this.evolve()

    return {
      nodeId: this.nodeId,
      classical: {
        publicKey: this.pub,
      },
      resonance: {
        state: this.res.toJSON(),
        primes: this.primes,
        timestamp: this.lastEvolution,
      },
    }
  }

  /**
   * Verify resonance with another key
   * Calculates coherence |⟨K_res_A | K_res_B⟩|²
   */
  resonanceWith(otherResonanceState) {
    const otherState = PrimeHilbertState.fromJSON(otherResonanceState)

    // Ensure we are using the same prime basis for inner product
    // In a real system, we'd align bases. Here we assume standard set.

    // Calculate coherence
    const innerProduct = this.res.inner(otherState)
    return Math.pow(innerProduct.magnitude(), 2)
  }

  toJSON() {
    return {
      nodeId: this.nodeId,
      lastEvolution: this.lastEvolution,
      priv: this.priv ? this.priv.toJSON() : null,
      res: this.res ? this.res.toJSON() : null,
      pub: this.pub,
      privKey: this.privKey, // CAUTION: Contains private key
    }
  }

  static fromJSON(data) {
    const triplet = new KeyTriplet(data.nodeId)
    triplet.lastEvolution = data.lastEvolution

    if (data.priv) triplet.priv = PrimeHilbertState.fromJSON(data.priv)
    if (data.res) triplet.res = PrimeHilbertState.fromJSON(data.res)

    triplet.pub = data.pub
    triplet.privKey = data.privKey

    return triplet
  }
}

module.exports = { KeyTriplet }
