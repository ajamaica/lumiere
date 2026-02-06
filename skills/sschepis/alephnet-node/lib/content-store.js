/**
 * Content-Addressed Storage for AlephNet
 *
 * Provides hash-addressed content storage:
 * - Store any content, receive hash for retrieval
 * - Deduplication via content addressing
 * - Visibility controls (public, friends, private)
 * - Integration with network for distributed storage
 *
 * @module @sschepis/alephnet-node/lib/content-store
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

/**
 * Compute SHA-256 hash of content
 * @param {Buffer|string} content - Content to hash
 * @returns {string} Hex-encoded hash
 */
function computeHash(content) {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Content types with MIME mapping
 */
const CONTENT_TYPES = {
  text: 'text/plain',
  json: 'application/json',
  markdown: 'text/markdown',
  html: 'text/html',
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  binary: 'application/octet-stream',
}

/**
 * Visibility levels
 */
const VISIBILITY = {
  public: 'public', // Anyone can access
  friends: 'friends', // Only friends can access
  private: 'private', // Only owner can access
  unlisted: 'unlisted', // Anyone with hash can access, not discoverable
}

/**
 * ContentEntry - Represents a stored content item
 */
class ContentEntry {
  constructor(data) {
    this.hash = data.hash
    this.type = data.type || 'binary'
    this.mimeType = data.mimeType || CONTENT_TYPES[this.type] || CONTENT_TYPES.binary
    this.size = data.size || 0
    this.owner = data.owner
    this.visibility = data.visibility || VISIBILITY.private
    this.metadata = data.metadata || {}
    this.createdAt = data.createdAt || Date.now()
    this.accessCount = data.accessCount || 0
    this.lastAccessed = data.lastAccessed || null
  }

  /**
   * Check if a user can access this content
   * @param {string} requesterId - Node ID of requester
   * @param {Set<string>} requesterFriends - Set of requester's friend node IDs
   * @returns {boolean}
   */
  canAccess(requesterId, requesterFriends = new Set()) {
    // Owner always has access
    if (requesterId === this.owner) return true

    switch (this.visibility) {
      case VISIBILITY.public:
      case VISIBILITY.unlisted:
        return true
      case VISIBILITY.friends:
        return requesterFriends.has(this.owner)
      case VISIBILITY.private:
        return false
      default:
        return false
    }
  }

  /**
   * Record an access
   */
  recordAccess() {
    this.accessCount++
    this.lastAccessed = Date.now()
  }

  toJSON() {
    return {
      hash: this.hash,
      type: this.type,
      mimeType: this.mimeType,
      size: this.size,
      owner: this.owner,
      visibility: this.visibility,
      metadata: this.metadata,
      createdAt: this.createdAt,
      accessCount: this.accessCount,
      lastAccessed: this.lastAccessed,
    }
  }
}

/**
 * ContentStore - Hash-addressed content storage
 */
class ContentStore extends EventEmitter {
  /**
   * Create a content store
   * @param {Object} options - Configuration options
   * @param {string} [options.basePath] - Base path for file storage
   * @param {string} [options.nodeId] - Owner node ID
   * @param {number} [options.maxSize] - Maximum total storage size in bytes
   */
  constructor(options = {}) {
    super()

    this.basePath = options.basePath || './data/content'
    this.nodeId = options.nodeId || 'local'
    this.maxSize = options.maxSize || 100 * 1024 * 1024 // 100MB default

    // In-memory index
    this.index = new Map() // hash -> ContentEntry
    this.ownerIndex = new Map() // nodeId -> Set<hash>

    // Stats
    this.totalSize = 0

    // Initialize storage
    this._initStorage()
  }

  /**
   * Initialize storage directories and load index
   * @private
   */
  _initStorage() {
    const contentDir = path.join(this.basePath, 'blobs')
    const indexPath = path.join(this.basePath, 'index.json')

    // Create directories
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true })
    }

    // Load existing index
    if (fs.existsSync(indexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'))

        for (const entry of data.entries || []) {
          const contentEntry = new ContentEntry(entry)
          this.index.set(contentEntry.hash, contentEntry)

          // Update owner index
          if (!this.ownerIndex.has(contentEntry.owner)) {
            this.ownerIndex.set(contentEntry.owner, new Set())
          }
          this.ownerIndex.get(contentEntry.owner).add(contentEntry.hash)

          this.totalSize += contentEntry.size
        }
      } catch (e) {
        console.warn('[ContentStore] Failed to load index:', e.message)
      }
    }
  }

  /**
   * Save index to disk
   * @private
   */
  _saveIndex() {
    const indexPath = path.join(this.basePath, 'index.json')
    const data = {
      version: 1,
      nodeId: this.nodeId,
      totalSize: this.totalSize,
      entryCount: this.index.size,
      savedAt: Date.now(),
      entries: Array.from(this.index.values()).map((e) => e.toJSON()),
    }

    fs.writeFileSync(indexPath, JSON.stringify(data, null, 2))
  }

  /**
   * Get blob path for a hash
   * @private
   */
  _getBlobPath(hash) {
    // Use first 2 characters as subdirectory for file distribution
    const subdir = hash.slice(0, 2)
    const dir = path.join(this.basePath, 'blobs', subdir)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    return path.join(dir, hash)
  }

  /**
   * Store content and return its hash
   * @param {Buffer|string|Object} content - Content to store
   * @param {Object} options - Storage options
   * @param {string} [options.type] - Content type
   * @param {string} [options.visibility] - Visibility level
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Object} Storage result with hash
   */
  store(content, options = {}) {
    // Serialize content
    let buffer
    let type = options.type || 'binary'

    if (typeof content === 'string') {
      buffer = Buffer.from(content, 'utf8')
      type = options.type || 'text'
    } else if (Buffer.isBuffer(content)) {
      buffer = content
    } else if (typeof content === 'object') {
      buffer = Buffer.from(JSON.stringify(content), 'utf8')
      type = options.type || 'json'
    } else {
      throw new Error('Content must be string, Buffer, or object')
    }

    // Check size limit
    if (this.totalSize + buffer.length > this.maxSize) {
      throw new Error('Storage limit exceeded')
    }

    // Compute hash
    const hash = computeHash(buffer)

    // Check if already exists
    if (this.index.has(hash)) {
      const existing = this.index.get(hash)
      return {
        hash,
        duplicate: true,
        size: existing.size,
        createdAt: existing.createdAt,
      }
    }

    // Write blob
    const blobPath = this._getBlobPath(hash)
    fs.writeFileSync(blobPath, buffer)

    // Create entry
    const entry = new ContentEntry({
      hash,
      type,
      mimeType: options.mimeType || CONTENT_TYPES[type] || CONTENT_TYPES.binary,
      size: buffer.length,
      owner: this.nodeId,
      visibility: options.visibility || VISIBILITY.private,
      metadata: options.metadata || {},
      createdAt: Date.now(),
    })

    // Update indexes
    this.index.set(hash, entry)

    if (!this.ownerIndex.has(this.nodeId)) {
      this.ownerIndex.set(this.nodeId, new Set())
    }
    this.ownerIndex.get(this.nodeId).add(hash)

    this.totalSize += buffer.length

    // Persist index
    this._saveIndex()

    this.emit('stored', {
      hash,
      size: buffer.length,
      type,
      visibility: entry.visibility,
    })

    return {
      hash,
      duplicate: false,
      size: buffer.length,
      type,
      visibility: entry.visibility,
      createdAt: entry.createdAt,
    }
  }

  /**
   * Retrieve content by hash
   * @param {string} hash - Content hash
   * @param {Object} options - Retrieval options
   * @param {string} [options.requesterId] - Node ID of requester
   * @param {Set<string>} [options.requesterFriends] - Requester's friends
   * @returns {Object|null} Content and metadata, or null if not found/unauthorized
   */
  retrieve(hash, options = {}) {
    const entry = this.index.get(hash)

    if (!entry) {
      return null
    }

    // Check access
    const requesterId = options.requesterId || this.nodeId
    const requesterFriends = options.requesterFriends || new Set()

    if (!entry.canAccess(requesterId, requesterFriends)) {
      return {
        error: 'access_denied',
        hash,
        visibility: entry.visibility,
      }
    }

    // Read blob
    const blobPath = this._getBlobPath(hash)

    if (!fs.existsSync(blobPath)) {
      // Entry exists but blob missing - cleanup
      this.index.delete(hash)
      this._saveIndex()
      return null
    }

    const buffer = fs.readFileSync(blobPath)

    // Record access
    entry.recordAccess()

    // Parse based on type
    let content
    switch (entry.type) {
      case 'text':
      case 'markdown':
      case 'html':
        content = buffer.toString('utf8')
        break
      case 'json':
        content = JSON.parse(buffer.toString('utf8'))
        break
      default:
        content = buffer
    }

    return {
      hash,
      content,
      type: entry.type,
      mimeType: entry.mimeType,
      size: entry.size,
      owner: entry.owner,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    }
  }

  /**
   * Check if content exists
   * @param {string} hash - Content hash
   * @returns {boolean}
   */
  has(hash) {
    return this.index.has(hash)
  }

  /**
   * Get content metadata without retrieving content
   * @param {string} hash - Content hash
   * @returns {Object|null}
   */
  getMetadata(hash) {
    const entry = this.index.get(hash)
    return entry ? entry.toJSON() : null
  }

  /**
   * Update content visibility
   * @param {string} hash - Content hash
   * @param {string} visibility - New visibility
   * @returns {boolean} Success
   */
  setVisibility(hash, visibility) {
    const entry = this.index.get(hash)

    if (!entry || entry.owner !== this.nodeId) {
      return false
    }

    if (!Object.values(VISIBILITY).includes(visibility)) {
      return false
    }

    entry.visibility = visibility
    this._saveIndex()

    this.emit('visibility-changed', { hash, visibility })
    return true
  }

  /**
   * Update content metadata
   * @param {string} hash - Content hash
   * @param {Object} metadata - New metadata (merged)
   * @returns {boolean} Success
   */
  updateMetadata(hash, metadata) {
    const entry = this.index.get(hash)

    if (!entry || entry.owner !== this.nodeId) {
      return false
    }

    entry.metadata = { ...entry.metadata, ...metadata }
    this._saveIndex()

    return true
  }

  /**
   * Delete content
   * @param {string} hash - Content hash
   * @returns {boolean} Success
   */
  delete(hash) {
    const entry = this.index.get(hash)

    if (!entry || entry.owner !== this.nodeId) {
      return false
    }

    // Remove blob
    const blobPath = this._getBlobPath(hash)
    if (fs.existsSync(blobPath)) {
      fs.unlinkSync(blobPath)
    }

    // Update indexes
    this.totalSize -= entry.size
    this.index.delete(hash)

    const ownerSet = this.ownerIndex.get(entry.owner)
    if (ownerSet) {
      ownerSet.delete(hash)
    }

    this._saveIndex()

    this.emit('deleted', { hash, size: entry.size })
    return true
  }

  /**
   * List content by owner
   * @param {string} [ownerId] - Owner node ID (defaults to self)
   * @param {Object} options - List options
   * @param {string} [options.visibility] - Filter by visibility
   * @param {string} [options.type] - Filter by type
   * @param {number} [options.limit] - Maximum results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Array<Object>} Content entries
   */
  listByOwner(ownerId = null, options = {}) {
    const owner = ownerId || this.nodeId
    const hashes = this.ownerIndex.get(owner)

    if (!hashes || hashes.size === 0) {
      return []
    }

    let entries = Array.from(hashes)
      .map((hash) => this.index.get(hash))
      .filter(Boolean)

    // Filter by visibility
    if (options.visibility) {
      entries = entries.filter((e) => e.visibility === options.visibility)
    }

    // Filter by type
    if (options.type) {
      entries = entries.filter((e) => e.type === options.type)
    }

    // Sort by creation date (newest first)
    entries.sort((a, b) => b.createdAt - a.createdAt)

    // Paginate
    const offset = options.offset || 0
    const limit = options.limit || 50
    entries = entries.slice(offset, offset + limit)

    return entries.map((e) => e.toJSON())
  }

  /**
   * List public content (for discovery)
   * @param {Object} options - List options
   * @returns {Array<Object>} Public content entries
   */
  listPublic(options = {}) {
    let entries = Array.from(this.index.values()).filter((e) => e.visibility === VISIBILITY.public)

    // Filter by type
    if (options.type) {
      entries = entries.filter((e) => e.type === options.type)
    }

    // Sort by popularity (access count)
    entries.sort((a, b) => b.accessCount - a.accessCount)

    // Paginate
    const offset = options.offset || 0
    const limit = options.limit || 50
    entries = entries.slice(offset, offset + limit)

    return entries.map((e) => e.toJSON())
  }

  /**
   * Search content by metadata
   * @param {Object} query - Search query
   * @param {Object} options - Search options
   * @returns {Array<Object>} Matching entries
   */
  search(query, options = {}) {
    const requesterId = options.requesterId || this.nodeId
    const requesterFriends = options.requesterFriends || new Set()

    let entries = Array.from(this.index.values()).filter((e) =>
      e.canAccess(requesterId, requesterFriends),
    )

    // Search in metadata
    if (query.metadata) {
      for (const [key, value] of Object.entries(query.metadata)) {
        entries = entries.filter((e) => {
          const metaValue = e.metadata[key]
          if (typeof value === 'string') {
            return String(metaValue).toLowerCase().includes(value.toLowerCase())
          }
          return metaValue === value
        })
      }
    }

    // Filter by type
    if (query.type) {
      entries = entries.filter((e) => e.type === query.type)
    }

    // Filter by owner
    if (query.owner) {
      entries = entries.filter((e) => e.owner === query.owner)
    }

    // Sort
    const sortBy = options.sortBy || 'createdAt'
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1
    entries.sort((a, b) => (a[sortBy] - b[sortBy]) * sortOrder)

    // Paginate
    const offset = options.offset || 0
    const limit = options.limit || 50
    entries = entries.slice(offset, offset + limit)

    return entries.map((e) => e.toJSON())
  }

  /**
   * Get storage statistics
   * @returns {Object}
   */
  getStats() {
    const typeStats = {}
    for (const entry of this.index.values()) {
      typeStats[entry.type] = (typeStats[entry.type] || 0) + 1
    }

    const visibilityStats = {}
    for (const entry of this.index.values()) {
      visibilityStats[entry.visibility] = (visibilityStats[entry.visibility] || 0) + 1
    }

    return {
      totalEntries: this.index.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      usagePercent: Math.round((this.totalSize / this.maxSize) * 100),
      byType: typeStats,
      byVisibility: visibilityStats,
      owners: this.ownerIndex.size,
    }
  }

  /**
   * Garbage collect - remove orphaned blobs
   */
  gc() {
    const blobDir = path.join(this.basePath, 'blobs')
    let cleaned = 0
    let freedBytes = 0

    const subdirs = fs
      .readdirSync(blobDir)
      .filter((f) => fs.statSync(path.join(blobDir, f)).isDirectory())

    for (const subdir of subdirs) {
      const subdirPath = path.join(blobDir, subdir)
      const files = fs.readdirSync(subdirPath)

      for (const file of files) {
        if (!this.index.has(file)) {
          const filePath = path.join(subdirPath, file)
          const stats = fs.statSync(filePath)
          freedBytes += stats.size
          fs.unlinkSync(filePath)
          cleaned++
        }
      }
    }

    return { cleaned, freedBytes }
  }

  toJSON() {
    return this.getStats()
  }
}

// Singleton store instance
let defaultStore = null

/**
 * Get or create the default content store
 * @param {Object} options - Options for store creation
 * @returns {ContentStore}
 */
function getContentStore(options = {}) {
  if (!defaultStore) {
    defaultStore = new ContentStore(options)
  }
  return defaultStore
}

module.exports = {
  ContentStore,
  ContentEntry,
  getContentStore,
  computeHash,
  CONTENT_TYPES,
  VISIBILITY,
}
