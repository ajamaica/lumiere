/**
 * MemoryBroker Interface
 *
 * Provides a pluggable memory backend abstraction for PRSC.
 * PRSC calls broker.get()/set() instead of importing SMF directly,
 * enabling future backends like Redis, SSD, or distributed storage.
 *
 * Features:
 * - Abstract interface for memory operations
 * - Multiple backend implementations (InMemory, File, Redis)
 * - Caching layer with configurable TTL
 * - Batch operations for efficiency
 * - Event-driven updates
 */

const { EventEmitter } = require('events')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ============================================================================
// MEMORY BROKER INTERFACE
// ============================================================================

/**
 * Abstract MemoryBroker interface
 *
 * All memory backends must implement this interface.
 */
class MemoryBroker extends EventEmitter {
  constructor(options = {}) {
    super()
    this.type = 'abstract'
    this.connected = false
  }

  // ========================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ========================================================================

  /**
   * Connect to the memory backend
   * @abstract
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented')
  }

  /**
   * Disconnect from the memory backend
   * @abstract
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented')
  }

  /**
   * Get a value by key
   * @abstract
   * @param {string} key - Key to retrieve
   * @returns {Promise<*>}
   */
  async get(key) {
    throw new Error('get() must be implemented')
  }

  /**
   * Set a value by key
   * @abstract
   * @param {string} key - Key to set
   * @param {*} value - Value to store
   * @param {Object} options - Set options (ttl, etc.)
   * @returns {Promise<void>}
   */
  async set(key, value, options = {}) {
    throw new Error('set() must be implemented')
  }

  /**
   * Delete a key
   * @abstract
   * @param {string} key - Key to delete
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    throw new Error('delete() must be implemented')
  }

  /**
   * Check if key exists
   * @abstract
   * @param {string} key - Key to check
   * @returns {Promise<boolean>}
   */
  async has(key) {
    throw new Error('has() must be implemented')
  }

  /**
   * Get multiple values by keys
   * @param {Array<string>} keys - Keys to retrieve
   * @returns {Promise<Map<string, *>>}
   */
  async getMany(keys) {
    const results = new Map()
    for (const key of keys) {
      results.set(key, await this.get(key))
    }
    return results
  }

  /**
   * Set multiple key-value pairs
   * @param {Map|Object} entries - Key-value pairs
   * @param {Object} options - Set options
   * @returns {Promise<void>}
   */
  async setMany(entries, options = {}) {
    const iterable = entries instanceof Map ? entries : Object.entries(entries)
    for (const [key, value] of iterable) {
      await this.set(key, value, options)
    }
  }

  /**
   * Clear all data
   * @abstract
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('clear() must be implemented')
  }

  /**
   * Get all keys matching pattern
   * @param {string} pattern - Pattern to match (glob-style)
   * @returns {Promise<Array<string>>}
   */
  async keys(pattern = '*') {
    throw new Error('keys() must be implemented')
  }

  /**
   * Get broker statistics
   * @returns {Object}
   */
  getStats() {
    return {
      type: this.type,
      connected: this.connected,
    }
  }
}

// ============================================================================
// IN-MEMORY BACKEND
// ============================================================================

/**
 * InMemoryBroker
 *
 * Simple in-memory storage backend. Fast but not persistent.
 */
class InMemoryBroker extends MemoryBroker {
  constructor(options = {}) {
    super(options)
    this.type = 'memory'
    this.store = new Map()
    this.ttls = new Map()
    this.cleanupInterval = options.cleanupInterval || 60000
    this.cleanupTimer = null
  }

  async connect() {
    this.connected = true
    this.startCleanup()
    this.emit('connected')
  }

  async disconnect() {
    this.stopCleanup()
    this.connected = false
    this.emit('disconnected')
  }

  async get(key) {
    this.checkExpired(key)
    return this.store.get(key)
  }

  async set(key, value, options = {}) {
    this.store.set(key, value)

    if (options.ttl) {
      this.ttls.set(key, Date.now() + options.ttl)
    }

    this.emit('set', { key, value })
  }

  async delete(key) {
    const existed = this.store.has(key)
    this.store.delete(key)
    this.ttls.delete(key)
    this.emit('delete', { key })
    return existed
  }

  async has(key) {
    this.checkExpired(key)
    return this.store.has(key)
  }

  async clear() {
    this.store.clear()
    this.ttls.clear()
    this.emit('clear')
  }

  async keys(pattern = '*') {
    const allKeys = Array.from(this.store.keys())
    if (pattern === '*') return allKeys

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return allKeys.filter((k) => regex.test(k))
  }

  checkExpired(key) {
    const expiry = this.ttls.get(key)
    if (expiry && Date.now() > expiry) {
      this.store.delete(key)
      this.ttls.delete(key)
    }
  }

  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, expiry] of this.ttls) {
        if (now > expiry) {
          this.store.delete(key)
          this.ttls.delete(key)
        }
      }
    }, this.cleanupInterval)
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  getStats() {
    return {
      ...super.getStats(),
      size: this.store.size,
      ttlKeys: this.ttls.size,
    }
  }
}

// ============================================================================
// FILE BACKEND
// ============================================================================

/**
 * FileBroker
 *
 * File-based storage backend. Persistent across restarts.
 * Uses JSON files with optional compression.
 */
class FileBroker extends MemoryBroker {
  constructor(options = {}) {
    super(options)
    this.type = 'file'
    this.dataDir = options.dataDir || './data/memory'
    this.cache = new Map()
    this.useCache = options.useCache ?? true
    this.syncOnWrite = options.syncOnWrite ?? false
  }

  async connect() {
    // Ensure data directory exists
    await fs.promises.mkdir(this.dataDir, { recursive: true })
    this.connected = true
    this.emit('connected')
  }

  async disconnect() {
    this.cache.clear()
    this.connected = false
    this.emit('disconnected')
  }

  getFilePath(key) {
    // Use hash for filesystem safety
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16)
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
    return path.join(this.dataDir, `${safeKey}-${hash}.json`)
  }

  async get(key) {
    if (this.useCache && this.cache.has(key)) {
      return this.cache.get(key)
    }

    const filePath = this.getFilePath(key)

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)

      // Check expiry
      if (data.expiry && Date.now() > data.expiry) {
        await this.delete(key)
        return undefined
      }

      if (this.useCache) {
        this.cache.set(key, data.value)
      }

      return data.value
    } catch (e) {
      if (e.code === 'ENOENT') return undefined
      throw e
    }
  }

  async set(key, value, options = {}) {
    const filePath = this.getFilePath(key)

    const data = {
      key,
      value,
      createdAt: Date.now(),
      expiry: options.ttl ? Date.now() + options.ttl : null,
    }

    const content = JSON.stringify(data, null, 2)
    await fs.promises.writeFile(filePath, content, 'utf-8')

    if (this.useCache) {
      this.cache.set(key, value)
    }

    this.emit('set', { key, value })
  }

  async delete(key) {
    const filePath = this.getFilePath(key)

    try {
      await fs.promises.unlink(filePath)
      this.cache.delete(key)
      this.emit('delete', { key })
      return true
    } catch (e) {
      if (e.code === 'ENOENT') return false
      throw e
    }
  }

  async has(key) {
    if (this.useCache && this.cache.has(key)) return true

    const filePath = this.getFilePath(key)
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async clear() {
    const files = await fs.promises.readdir(this.dataDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.promises.unlink(path.join(this.dataDir, file))
      }
    }
    this.cache.clear()
    this.emit('clear')
  }

  async keys(pattern = '*') {
    const files = await fs.promises.readdir(this.dataDir)
    const keys = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const content = await fs.promises.readFile(path.join(this.dataDir, file), 'utf-8')
        const data = JSON.parse(content)
        if (data.key) keys.push(data.key)
      } catch {
        // Skip invalid files
      }
    }

    if (pattern === '*') return keys

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return keys.filter((k) => regex.test(k))
  }

  getStats() {
    return {
      ...super.getStats(),
      dataDir: this.dataDir,
      cacheSize: this.cache.size,
    }
  }
}

// ============================================================================
// REDIS BACKEND (Placeholder)
// ============================================================================

/**
 * RedisBroker
 *
 * Redis-based storage backend. Requires redis package.
 * Placeholder implementation - requires redis npm package.
 */
class RedisBroker extends MemoryBroker {
  constructor(options = {}) {
    super(options)
    this.type = 'redis'
    this.url = options.url || 'redis://localhost:6379'
    this.prefix = options.prefix || 'sentient:'
    this.client = null
  }

  async connect() {
    try {
      const Redis = require('redis')
      this.client = Redis.createClient({ url: this.url })
      await this.client.connect()
      this.connected = true
      this.emit('connected')
    } catch (e) {
      throw new Error(
        `Redis connection failed: ${e.message}. Install redis package with: npm install redis`,
      )
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
    this.connected = false
    this.emit('disconnected')
  }

  async get(key) {
    const value = await this.client.get(this.prefix + key)
    return value ? JSON.parse(value) : undefined
  }

  async set(key, value, options = {}) {
    const redisKey = this.prefix + key
    const jsonValue = JSON.stringify(value)

    if (options.ttl) {
      await this.client.setEx(redisKey, Math.ceil(options.ttl / 1000), jsonValue)
    } else {
      await this.client.set(redisKey, jsonValue)
    }

    this.emit('set', { key, value })
  }

  async delete(key) {
    const count = await this.client.del(this.prefix + key)
    this.emit('delete', { key })
    return count > 0
  }

  async has(key) {
    return (await this.client.exists(this.prefix + key)) === 1
  }

  async clear() {
    const keys = await this.client.keys(this.prefix + '*')
    if (keys.length > 0) {
      await this.client.del(keys)
    }
    this.emit('clear')
  }

  async keys(pattern = '*') {
    const redisPattern = this.prefix + pattern.replace(/\*/g, '*')
    const keys = await this.client.keys(redisPattern)
    return keys.map((k) => k.slice(this.prefix.length))
  }
}

// ============================================================================
// CACHING BROKER WRAPPER
// ============================================================================

/**
 * CachingBroker
 *
 * Wraps another broker with a caching layer for faster reads.
 */
class CachingBroker extends MemoryBroker {
  constructor(backend, options = {}) {
    super(options)
    this.type = 'caching'
    this.backend = backend
    this.cache = new Map()
    this.maxCacheSize = options.maxCacheSize || 1000
    this.defaultTtl = options.defaultTtl || 60000
    this.cacheExpiry = new Map()
  }

  async connect() {
    await this.backend.connect()
    this.connected = true
    this.emit('connected')
  }

  async disconnect() {
    await this.backend.disconnect()
    this.cache.clear()
    this.cacheExpiry.clear()
    this.connected = false
    this.emit('disconnected')
  }

  async get(key) {
    // Check cache first
    const expiry = this.cacheExpiry.get(key)
    if (expiry && Date.now() < expiry) {
      return this.cache.get(key)
    }

    // Fetch from backend
    const value = await this.backend.get(key)
    if (value !== undefined) {
      this.cacheSet(key, value)
    }

    return value
  }

  async set(key, value, options = {}) {
    await this.backend.set(key, value, options)
    this.cacheSet(key, value, options.ttl)
    this.emit('set', { key, value })
  }

  cacheSet(key, value, ttl = this.defaultTtl) {
    // Evict if at capacity
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
      this.cacheExpiry.delete(oldestKey)
    }

    this.cache.set(key, value)
    this.cacheExpiry.set(key, Date.now() + ttl)
  }

  async delete(key) {
    this.cache.delete(key)
    this.cacheExpiry.delete(key)
    return this.backend.delete(key)
  }

  async has(key) {
    const expiry = this.cacheExpiry.get(key)
    if (expiry && Date.now() < expiry && this.cache.has(key)) {
      return true
    }
    return this.backend.has(key)
  }

  async clear() {
    this.cache.clear()
    this.cacheExpiry.clear()
    return this.backend.clear()
  }

  async keys(pattern) {
    return this.backend.keys(pattern)
  }

  invalidate(key) {
    this.cache.delete(key)
    this.cacheExpiry.delete(key)
  }

  invalidateAll() {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  getStats() {
    return {
      type: this.type,
      connected: this.connected,
      cacheSize: this.cache.size,
      backendStats: this.backend.getStats(),
    }
  }
}

// ============================================================================
// SMF-SPECIFIC BROKER
// ============================================================================

/**
 * SMFBroker
 *
 * Specialized broker for SMF (Sedenion Memory Field) operations.
 * Provides SMF-specific methods while using a generic backend.
 */
class SMFBroker extends EventEmitter {
  constructor(backend, options = {}) {
    super()
    this.backend = backend
    this.prefix = options.prefix || 'smf:'
  }

  async connect() {
    await this.backend.connect()
  }

  async disconnect() {
    await this.backend.disconnect()
  }

  // SMF-specific key helpers
  smfKey() {
    return this.prefix + 'state'
  }
  axisKey(i) {
    return this.prefix + `axis:${i}`
  }
  codebookKey() {
    return this.prefix + 'codebook'
  }
  historyKey(tick) {
    return this.prefix + `history:${tick}`
  }

  /**
   * Get full SMF state
   * @returns {Promise<Object>}
   */
  async getSMF() {
    return this.backend.get(this.smfKey())
  }

  /**
   * Set full SMF state
   * @param {Object} smf - SMF state object
   * @returns {Promise<void>}
   */
  async setSMF(smf) {
    await this.backend.set(this.smfKey(), smf)
    this.emit('smf_updated', smf)
  }

  /**
   * Get SMF axes array
   * @returns {Promise<Float64Array>}
   */
  async getAxes() {
    const smf = await this.getSMF()
    return smf?.s || new Float64Array(16)
  }

  /**
   * Set SMF axes
   * @param {Float64Array|Array} axes - 16-element axes array
   * @returns {Promise<void>}
   */
  async setAxes(axes) {
    const smf = (await this.getSMF()) || {}
    smf.s = Array.from(axes)
    await this.setSMF(smf)
  }

  /**
   * Get single axis value
   * @param {number} index - Axis index (0-15)
   * @returns {Promise<number>}
   */
  async getAxis(index) {
    const axes = await this.getAxes()
    return axes[index] || 0
  }

  /**
   * Set single axis value
   * @param {number} index - Axis index (0-15)
   * @param {number} value - New value
   * @returns {Promise<void>}
   */
  async setAxis(index, value) {
    const axes = await this.getAxes()
    axes[index] = value
    await this.setAxes(axes)
  }

  /**
   * Rotate multiple axes atomically
   * @param {Object} rotations - Map of index -> delta
   * @returns {Promise<void>}
   */
  async rotateAxes(rotations) {
    const axes = await this.getAxes()
    for (const [index, delta] of Object.entries(rotations)) {
      axes[Number(index)] = (axes[Number(index)] || 0) + delta
    }
    await this.setAxes(axes)
  }

  /**
   * Get codebook state
   * @returns {Promise<Object>}
   */
  async getCodebook() {
    return this.backend.get(this.codebookKey())
  }

  /**
   * Set codebook state
   * @param {Object} codebook - Codebook object
   * @returns {Promise<void>}
   */
  async setCodebook(codebook) {
    await this.backend.set(this.codebookKey(), codebook)
  }

  /**
   * Store SMF history snapshot
   * @param {number} tick - Tick number
   * @param {Object} snapshot - Snapshot data
   * @param {number} ttl - Time to live in ms
   * @returns {Promise<void>}
   */
  async storeHistory(tick, snapshot, ttl = 3600000) {
    await this.backend.set(this.historyKey(tick), snapshot, { ttl })
  }

  /**
   * Get SMF history snapshot
   * @param {number} tick - Tick number
   * @returns {Promise<Object>}
   */
  async getHistory(tick) {
    return this.backend.get(this.historyKey(tick))
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    return {
      type: 'smf-broker',
      backendStats: this.backend.getStats(),
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a memory broker from configuration
 * @param {Object} config - Broker configuration
 * @returns {MemoryBroker}
 */
function createBroker(config = {}) {
  const type = config.type || 'memory'

  let broker
  switch (type) {
    case 'memory':
      broker = new InMemoryBroker(config)
      break

    case 'file':
      broker = new FileBroker(config)
      break

    case 'redis':
      broker = new RedisBroker(config)
      break

    default:
      throw new Error(`Unknown broker type: ${type}`)
  }

  // Wrap with caching if requested
  if (config.cache) {
    broker = new CachingBroker(broker, config.cacheOptions || {})
  }

  return broker
}

/**
 * Create an SMF-specific broker
 * @param {Object} config - Broker configuration
 * @returns {SMFBroker}
 */
function createSMFBroker(config = {}) {
  const backend = createBroker(config)
  return new SMFBroker(backend, config)
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Base interface
  MemoryBroker,

  // Implementations
  InMemoryBroker,
  FileBroker,
  RedisBroker,
  CachingBroker,
  SMFBroker,

  // Factory
  createBroker,
  createSMFBroker,
}
