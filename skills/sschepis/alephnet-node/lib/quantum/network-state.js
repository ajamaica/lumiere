/**
 * Network State & Genesis Anchor
 * Loads and validates the Genesis Record to establish the network's Trust Root.
 */

'use strict'

const fs = require('fs')
const path = require('path')

// Default location for genesis.json
const DEFAULT_GENESIS_PATH = path.join(process.cwd(), 'data', 'content', 'genesis.json')

class NetworkState {
  constructor() {
    this.genesis = null
    this.genesisHash = null
    this.alephKey = null
    this.initialized = false
  }

  /**
   * Load genesis from disk
   * @param {string} [customPath]
   */
  load(customPath = null) {
    const genesisPath = customPath || DEFAULT_GENESIS_PATH

    try {
      if (!fs.existsSync(genesisPath)) {
        console.warn('[Network] No Genesis Record found. Network is uninitialized.')
        return false
      }

      const raw = fs.readFileSync(genesisPath, 'utf8')
      const data = JSON.parse(raw)

      // Validate structure
      if (!data.id || !data.resonance || !data.aleph) {
        throw new Error('Invalid Genesis Record format')
      }

      this.genesis = data
      this.genesisHash = data.resonance.tensorHash || data.id // Use tensor hash as root
      this.alephKey = data.aleph.publicKey
      this.initialized = true

      console.log(`[Network] Trust Root Anchored: ${this.genesisHash.slice(0, 16)}...`)
      return true
    } catch (e) {
      console.error('[Network] Failed to load genesis:', e.message)
      return false
    }
  }

  /**
   * Get the Network Context string for KeyTriplet generation
   * This forces all new keys to be entangled with this specific genesis.
   */
  getContext() {
    if (!this.initialized) {
      // Fallback for pre-genesis bootstrapping
      return 'BOOTSTRAP_PHASE'
    }
    return this.genesisHash
  }

  /**
   * Verify if a public key belongs to the Network Root (Aleph)
   */
  isRoot(publicKey) {
    return this.initialized && publicKey === this.alephKey
  }
}

// Singleton
const networkState = new NetworkState()

module.exports = {
  networkState,
  DEFAULT_GENESIS_PATH,
}
