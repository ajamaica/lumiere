/**
 * Identity Management for AlephNet (Quantum-Enhanced)
 *
 * Provides cryptographic identity for network participants:
 * - Prime-Resonant Keytriplets (Priv, Pub, Res)
 * - Symbolic Field Evolution
 * - Identity persistence and export
 *
 * @module @sschepis/alephnet-node/lib/identity
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const { KeyTriplet } = require('./quantum/keytriplet')

/**
 * Generate a cryptographically secure random node ID
 * @returns {string} 32-character hex node ID
 */
function generateNodeId() {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Derive a fingerprint from a public key
 * @param {Buffer|string} publicKey - The public key
 * @returns {string} 16-character fingerprint
 */
function deriveFingerprint(publicKey) {
  const keyBuffer =
    typeof publicKey === 'string'
      ? Buffer.from(publicKey, 'base64') // Ed25519 is stored as base64 in KeyTriplet
      : publicKey
  const hash = crypto.createHash('sha256').update(keyBuffer).digest()
  return hash.slice(0, 8).toString('hex')
}

/**
 * Identity - Cryptographic identity for AlephNet participation
 * Now powered by Prime-Resonant Keytriplets.
 */
class Identity extends EventEmitter {
  /**
   * Create or load an identity
   * @param {Object} options - Configuration options
   * @param {string} [options.storagePath] - Path to store identity
   * @param {string} [options.displayName] - Display name
   * @param {string} [options.bio] - Short bio
   */
  constructor(options = {}) {
    super()

    this.storagePath = options.storagePath || null
    this.displayName = options.displayName || 'Anonymous'
    this.bio = options.bio || ''

    // Identity state
    this.nodeId = null
    this.keyTriplet = null // Instance of KeyTriplet
    this.createdAt = null

    // Auto-load if storage path exists
    if (this.storagePath && fs.existsSync(this.storagePath)) {
      this.load()
    }
  }

  /**
   * Generate a new identity with fresh KeyTriplet
   * @returns {Promise<Identity>} This identity (for chaining)
   */
  async generate() {
    this.nodeId = generateNodeId()
    this.createdAt = Date.now()

    // Initialize KeyTriplet
    this.keyTriplet = new KeyTriplet(this.nodeId)
    this.keyTriplet.generate() // Generates Priv, Res, and Pub keys

    this.emit('generated', {
      nodeId: this.nodeId,
      fingerprint: this.fingerprint,
    })

    // Auto-save if storage path set
    if (this.storagePath) {
      this.save()
    }

    return this
  }

  // Getters for backward compatibility and ease of use
  get publicKey() {
    return this.keyTriplet ? this.keyTriplet.pub : null
  }

  get privateKey() {
    return this.keyTriplet ? this.keyTriplet.privKey : null
  }

  get fingerprint() {
    return this.publicKey ? deriveFingerprint(this.publicKey) : null
  }

  /**
   * Sign a message with the private key
   * @param {string|Buffer} message - Message to sign
   * @returns {string} Base64-encoded signature
   */
  sign(message) {
    if (!this.keyTriplet || !this.keyTriplet.privKey) {
      throw new Error('No private key available. Generate or load an identity first.')
    }

    // Evolve key state before signing (Time Evolution U(dt))
    this.keyTriplet.evolve()

    const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message

    const privateKeyDer = Buffer.from(this.keyTriplet.privKey, 'base64')
    const privateKeyObject = crypto.createPrivateKey({
      key: privateKeyDer,
      format: 'der',
      type: 'pkcs8',
    })

    const signature = crypto.sign(null, messageBuffer, privateKeyObject)
    return signature.toString('base64')
  }

  /**
   * Verify a signature against a message
   * @param {string|Buffer} message - Original message
   * @param {string} signature - Base64-encoded signature
   * @param {string} [publicKey] - Optional public key (uses own if not provided)
   * @returns {boolean} Whether signature is valid
   */
  verify(message, signature, publicKey = null) {
    const keyBase64 = publicKey || this.publicKey
    if (!keyBase64) {
      throw new Error('No public key available for verification.')
    }

    const messageBuffer = typeof message === 'string' ? Buffer.from(message, 'utf8') : message

    const signatureBuffer = Buffer.from(signature, 'base64')
    const publicKeyDer = Buffer.from(keyBase64, 'base64')

    const publicKeyObject = crypto.createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    })

    return crypto.verify(null, messageBuffer, publicKeyObject, signatureBuffer)
  }

  /**
   * Save identity to storage
   * @param {string} [password] - Optional password to encrypt private key
   */
  save(password = null) {
    if (!this.storagePath) {
      throw new Error('No storage path configured.')
    }

    const dir = path.dirname(this.storagePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Get raw triplet data
    const tripletData = this.keyTriplet.toJSON()
    let privateKeyData = tripletData.privKey

    // Encrypt private key if password provided
    if (password && privateKeyData) {
      const key = crypto.scryptSync(password, 'alephnet-salt', 32)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(privateKeyData, 'base64')),
        cipher.final(),
      ])
      const authTag = cipher.getAuthTag()

      // Store encrypted blob instead of raw key
      tripletData.privKey = JSON.stringify({
        encrypted: true,
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      })
    }

    const data = {
      version: 2, // Bump version for KeyTriplet support
      nodeId: this.nodeId,
      keyTriplet: tripletData, // Store full structure
      displayName: this.displayName,
      bio: this.bio,
      createdAt: this.createdAt,
      savedAt: Date.now(),
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2))
    this.emit('saved', { path: this.storagePath })
  }

  /**
   * Load identity from storage
   * @param {string} [password] - Password to decrypt private key
   * @returns {Identity} This identity (for chaining)
   */
  load(password = null) {
    if (!this.storagePath) {
      throw new Error('No storage path configured.')
    }

    if (!fs.existsSync(this.storagePath)) {
      throw new Error(`Identity file not found: ${this.storagePath}`)
    }

    const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'))

    this.nodeId = data.nodeId
    this.displayName = data.displayName || 'Anonymous'
    this.bio = data.bio || ''
    this.createdAt = data.createdAt

    // Handle Legacy (v1) vs KeyTriplet (v2)
    if (data.keyTriplet) {
      // Version 2: Load KeyTriplet
      const tripletData = data.keyTriplet

      // Handle decryption
      if (typeof tripletData.privKey === 'string' && tripletData.privKey.startsWith('{')) {
        const encryptedData = JSON.parse(tripletData.privKey)
        if (encryptedData.encrypted) {
          if (!password) {
            tripletData.privKey = null // Locked
          } else {
            const key = crypto.scryptSync(password, 'alephnet-salt', 32)
            const decipher = crypto.createDecipheriv(
              'aes-256-gcm',
              key,
              Buffer.from(encryptedData.iv, 'base64'),
            )
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'))
            const decrypted = Buffer.concat([
              decipher.update(Buffer.from(encryptedData.data, 'base64')),
              decipher.final(),
            ])
            tripletData.privKey = decrypted.toString('base64')
          }
        }
      }

      this.keyTriplet = KeyTriplet.fromJSON(tripletData)
    } else {
      // Version 1: Legacy upgrade
      console.log('[Identity] Upgrading legacy v1 identity to v2 KeyTriplet...')
      this.keyTriplet = new KeyTriplet(this.nodeId)
      // We can't recover the seed, so we must regenerate the Resonance parts
      // But we MUST keep the Classical Keypair if present

      // Note: v1 stored raw keys. We can inject them.
      // For now, let's just generate a fresh resonance structure
      // but inject the legacy keys so `publicKey` stays stable.
      this.keyTriplet.generate() // New resonance state

      if (data.publicKey && data.privateKey) {
        this.keyTriplet.pub = data.publicKey
        this.keyTriplet.privKey = data.privateKey
      }
    }

    this.emit('loaded', { nodeId: this.nodeId })
    return this
  }

  /**
   * Export public identity (K_pub + K_res)
   * Safe to share.
   */
  exportPublic() {
    if (!this.keyTriplet) return null

    // Ensure resonance state is fresh
    this.keyTriplet.evolve()

    return {
      nodeId: this.nodeId,
      displayName: this.displayName,
      bio: this.bio,
      createdAt: this.createdAt,
      // The Formal Public Identity Bundle
      identity: this.keyTriplet.getPublicIdentity(),
    }
  }

  /**
   * Check if this identity has a private key (can sign)
   */
  canSign() {
    return !!this.keyTriplet && !!this.keyTriplet.privKey
  }

  toJSON() {
    return this.exportPublic()
  }
}

/**
 * IdentityManager - Manages multiple identities
 */
class IdentityManager extends EventEmitter {
  constructor(options = {}) {
    super()
    this.basePath = options.basePath || './data/identities'
    this.identities = new Map()
    this.activeId = null

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    this._loadAll()
  }

  _loadAll() {
    try {
      const files = fs.readdirSync(this.basePath).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        try {
          const identity = new Identity({ storagePath: path.join(this.basePath, file) })
          identity.load()
          this.identities.set(identity.nodeId, identity)
        } catch (e) {
          console.warn(`[IdentityManager] Failed to load ${file}:`, e.message)
        }
      }
      if (this.identities.size > 0) {
        this.activeId = this.identities.keys().next().value
      }
    } catch (e) {}
  }

  async create(options = {}) {
    const identity = new Identity({
      storagePath: path.join(this.basePath, `${generateNodeId()}.json`),
      displayName: options.displayName,
      bio: options.bio,
    })

    await identity.generate()
    identity.save()

    this.identities.set(identity.nodeId, identity)
    if (this.identities.size === 1) this.activeId = identity.nodeId

    this.emit('created', identity.exportPublic())
    return identity
  }

  getActive() {
    if (!this.activeId) return null
    return this.identities.get(this.activeId) || null
  }

  get(nodeId) {
    return this.identities.get(nodeId) || null
  }

  list() {
    return Array.from(this.identities.values()).map((id) => ({
      ...id.exportPublic(),
      isActive: id.nodeId === this.activeId,
    }))
  }
}

// Singleton
let defaultManager = null
function getIdentityManager(options = {}) {
  if (!defaultManager) defaultManager = new IdentityManager(options)
  return defaultManager
}

module.exports = {
  Identity,
  IdentityManager,
  getIdentityManager,
  generateNodeId,
  deriveFingerprint,
}
