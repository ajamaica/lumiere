/**
 * Profile Management for AlephNet
 *
 * Manages user profiles:
 * - Display name, bio, avatar
 * - Public link lists
 * - Profile visibility settings
 * - Profile discovery
 *
 * @module @sschepis/alephnet-node/lib/profiles
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

/**
 * ProfileLink - A link in a profile's link list
 */
class ProfileLink {
  constructor(data) {
    this.id = data.id || `link_${crypto.randomBytes(4).toString('hex')}`
    this.type = data.type || 'url' // url, content, profile, custom
    this.url = data.url || null
    this.contentHash = data.contentHash || null // For content type
    this.targetNodeId = data.targetNodeId || null // For profile type
    this.title = data.title || ''
    this.description = data.description || ''
    this.icon = data.icon || null
    this.order = data.order || 0
    this.visibility = data.visibility || 'public' // public, friends, private
    this.createdAt = data.createdAt || Date.now()
    this.clicks = data.clicks || 0
  }

  /**
   * Record a click
   */
  click() {
    this.clicks++
  }

  /**
   * Get the effective URL for this link
   */
  getUrl() {
    if (this.type === 'url') return this.url
    if (this.type === 'content') return `aleph://content/${this.contentHash}`
    if (this.type === 'profile') return `aleph://profile/${this.targetNodeId}`
    return this.url
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      url: this.getUrl(),
      contentHash: this.contentHash,
      targetNodeId: this.targetNodeId,
      title: this.title,
      description: this.description,
      icon: this.icon,
      order: this.order,
      visibility: this.visibility,
      createdAt: this.createdAt,
      clicks: this.clicks,
    }
  }
}

/**
 * Profile - User profile data
 */
class Profile extends EventEmitter {
  /**
   * Create a profile
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {string} [options.storagePath] - Path to store profile
   */
  constructor(options = {}) {
    super()

    if (!options.nodeId) {
      throw new Error('nodeId is required')
    }

    this.nodeId = options.nodeId
    this.storagePath = options.storagePath || null

    // Profile data
    this.displayName = options.displayName || 'Anonymous'
    this.bio = options.bio || ''
    this.avatarHash = options.avatarHash || null // Content hash of avatar
    this.coverHash = options.coverHash || null // Content hash of cover image
    this.theme = options.theme || 'default'
    this.visibility = options.visibility || 'public' // public, friends, private

    // Contact info (privacy-controlled)
    this.contact = {
      email: null,
      website: null,
      twitter: null,
      github: null,
      ...options.contact,
    }
    this.contactVisibility = options.contactVisibility || 'friends'

    // Links
    this.links = new Map() // id -> ProfileLink

    // Stats
    this.profileViews = 0
    this.createdAt = options.createdAt || Date.now()
    this.updatedAt = options.updatedAt || Date.now()

    // Verification
    this.verified = options.verified || false
    this.publicKey = options.publicKey || null
    this.fingerprint = options.fingerprint || null

    // Load if storage exists
    if (this.storagePath && fs.existsSync(this.storagePath)) {
      this.load()
    }
  }

  /**
   * Update profile fields
   * @param {Object} updates - Fields to update
   */
  update(updates) {
    const allowedFields = [
      'displayName',
      'bio',
      'avatarHash',
      'coverHash',
      'theme',
      'visibility',
      'contact',
      'contactVisibility',
    ]

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'contact') {
          this.contact = { ...this.contact, ...value }
        } else {
          this[key] = value
        }
      }
    }

    this.updatedAt = Date.now()
    this._save()

    this.emit('updated', this.toPublic())
  }

  /**
   * Add a link to the profile
   * @param {Object} linkData - Link data
   * @returns {ProfileLink}
   */
  addLink(linkData) {
    const link = new ProfileLink({
      ...linkData,
      order: this.links.size,
    })

    this.links.set(link.id, link)
    this.updatedAt = Date.now()
    this._save()

    this.emit('link_added', link.toJSON())

    return link
  }

  /**
   * Update a link
   * @param {string} linkId - Link ID
   * @param {Object} updates - Fields to update
   * @returns {boolean}
   */
  updateLink(linkId, updates) {
    const link = this.links.get(linkId)
    if (!link) return false

    const allowedFields = ['url', 'title', 'description', 'icon', 'order', 'visibility']

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        link[key] = value
      }
    }

    this.updatedAt = Date.now()
    this._save()

    return true
  }

  /**
   * Remove a link
   * @param {string} linkId - Link ID
   * @returns {boolean}
   */
  removeLink(linkId) {
    const existed = this.links.delete(linkId)

    if (existed) {
      this.updatedAt = Date.now()
      this._save()
      this.emit('link_removed', linkId)
    }

    return existed
  }

  /**
   * Reorder links
   * @param {Array<string>} linkIds - Link IDs in new order
   */
  reorderLinks(linkIds) {
    let order = 0
    for (const id of linkIds) {
      const link = this.links.get(id)
      if (link) {
        link.order = order++
      }
    }

    this.updatedAt = Date.now()
    this._save()
  }

  /**
   * Get links (respecting visibility)
   * @param {Object} options - Query options
   * @param {string} [options.requesterId] - Requester node ID
   * @param {boolean} [options.isFriend] - Whether requester is a friend
   * @returns {Array<Object>}
   */
  getLinks(options = {}) {
    const requesterId = options.requesterId
    const isFriend = options.isFriend || false
    const isOwner = requesterId === this.nodeId

    let links = Array.from(this.links.values())

    // Filter by visibility
    links = links.filter((link) => {
      if (isOwner) return true
      if (link.visibility === 'public') return true
      if (link.visibility === 'friends' && isFriend) return true
      return false
    })

    // Sort by order
    links.sort((a, b) => a.order - b.order)

    return links.map((l) => l.toJSON())
  }

  /**
   * Record a profile view
   * @param {string} viewerId - Viewer's node ID
   */
  recordView(viewerId) {
    if (viewerId !== this.nodeId) {
      this.profileViews++
      this.emit('viewed', viewerId)
    }
  }

  /**
   * Get public profile data (for sharing)
   * @param {Object} options - Options
   * @param {string} [options.requesterId] - Requester node ID
   * @param {boolean} [options.isFriend] - Whether requester is a friend
   * @returns {Object}
   */
  toPublic(options = {}) {
    const requesterId = options.requesterId
    const isFriend = options.isFriend || false
    const isOwner = requesterId === this.nodeId

    // Check visibility
    if (this.visibility === 'private' && !isOwner) {
      return {
        nodeId: this.nodeId,
        displayName: this.displayName,
        visibility: 'private',
        restricted: true,
      }
    }

    if (this.visibility === 'friends' && !isFriend && !isOwner) {
      return {
        nodeId: this.nodeId,
        displayName: this.displayName,
        visibility: 'friends',
        restricted: true,
      }
    }

    // Build public profile
    const profile = {
      nodeId: this.nodeId,
      displayName: this.displayName,
      bio: this.bio,
      avatarHash: this.avatarHash,
      coverHash: this.coverHash,
      theme: this.theme,
      visibility: this.visibility,
      verified: this.verified,
      fingerprint: this.fingerprint,
      links: this.getLinks(options),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }

    // Add contact info based on visibility
    if (
      isOwner ||
      this.contactVisibility === 'public' ||
      (this.contactVisibility === 'friends' && isFriend)
    ) {
      profile.contact = this.contact
    }

    // Add stats for owner
    if (isOwner) {
      profile.stats = {
        profileViews: this.profileViews,
        linkCount: this.links.size,
      }
    }

    return profile
  }

  /**
   * Get full profile data (for owner only)
   * @returns {Object}
   */
  toFull() {
    return {
      nodeId: this.nodeId,
      displayName: this.displayName,
      bio: this.bio,
      avatarHash: this.avatarHash,
      coverHash: this.coverHash,
      theme: this.theme,
      visibility: this.visibility,
      contact: this.contact,
      contactVisibility: this.contactVisibility,
      verified: this.verified,
      publicKey: this.publicKey,
      fingerprint: this.fingerprint,
      links: Array.from(this.links.values()).map((l) => l.toJSON()),
      stats: {
        profileViews: this.profileViews,
        linkCount: this.links.size,
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  /**
   * Save to storage
   * @private
   */
  _save() {
    if (!this.storagePath) return

    const dir = path.dirname(this.storagePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const data = {
      version: 1,
      nodeId: this.nodeId,
      displayName: this.displayName,
      bio: this.bio,
      avatarHash: this.avatarHash,
      coverHash: this.coverHash,
      theme: this.theme,
      visibility: this.visibility,
      contact: this.contact,
      contactVisibility: this.contactVisibility,
      verified: this.verified,
      publicKey: this.publicKey,
      fingerprint: this.fingerprint,
      links: Array.from(this.links.values()).map((l) => l.toJSON()),
      profileViews: this.profileViews,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      savedAt: Date.now(),
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2))
  }

  /**
   * Load from storage
   */
  load() {
    if (!this.storagePath || !fs.existsSync(this.storagePath)) {
      return
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'))

      this.displayName = data.displayName || 'Anonymous'
      this.bio = data.bio || ''
      this.avatarHash = data.avatarHash || null
      this.coverHash = data.coverHash || null
      this.theme = data.theme || 'default'
      this.visibility = data.visibility || 'public'
      this.contact = data.contact || {}
      this.contactVisibility = data.contactVisibility || 'friends'
      this.verified = data.verified || false
      this.publicKey = data.publicKey || null
      this.fingerprint = data.fingerprint || null
      this.profileViews = data.profileViews || 0
      this.createdAt = data.createdAt || Date.now()
      this.updatedAt = data.updatedAt || Date.now()

      // Load links
      for (const l of data.links || []) {
        this.links.set(l.id, new ProfileLink(l))
      }
    } catch (e) {
      console.warn('[Profile] Failed to load:', e.message)
    }
  }

  toJSON() {
    return this.toPublic()
  }
}

/**
 * ProfileCache - Caches other users' profiles
 */
class ProfileCache extends EventEmitter {
  constructor(options = {}) {
    super()

    this.cache = new Map() // nodeId -> { profile, fetchedAt, ttl }
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5 minutes
    this.maxSize = options.maxSize || 1000
  }

  /**
   * Get cached profile
   * @param {string} nodeId - Node ID
   * @returns {Object|null}
   */
  get(nodeId) {
    const entry = this.cache.get(nodeId)

    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.fetchedAt > entry.ttl) {
      this.cache.delete(nodeId)
      return null
    }

    return entry.profile
  }

  /**
   * Set cached profile
   * @param {string} nodeId - Node ID
   * @param {Object} profile - Profile data
   * @param {number} [ttl] - TTL in ms
   */
  set(nodeId, profile, ttl = null) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].fetchedAt - b[1].fetchedAt,
      )[0]
      if (oldest) {
        this.cache.delete(oldest[0])
      }
    }

    this.cache.set(nodeId, {
      profile,
      fetchedAt: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  /**
   * Invalidate cached profile
   * @param {string} nodeId - Node ID
   */
  invalidate(nodeId) {
    this.cache.delete(nodeId)
  }

  /**
   * Clear all cached profiles
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Get cache stats
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
    }
  }
}

/**
 * ProfileManager - Manages local profile and profile cache
 */
class ProfileManager extends EventEmitter {
  /**
   * Create a profile manager
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {string} [options.basePath] - Base path for storage
   */
  constructor(options = {}) {
    super()

    if (!options.nodeId) {
      throw new Error('nodeId is required')
    }

    this.nodeId = options.nodeId
    this.basePath = options.basePath || './data/profiles'

    // Create base path
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    // Own profile
    this.profile = new Profile({
      nodeId: options.nodeId,
      storagePath: path.join(this.basePath, `${options.nodeId}.json`),
      ...options.profile,
    })

    // Profile cache for other users
    this.cache = new ProfileCache(options.cache)
  }

  /**
   * Get own profile
   * @returns {Object}
   */
  getOwnProfile() {
    return this.profile.toFull()
  }

  /**
   * Update own profile
   * @param {Object} updates - Fields to update
   */
  updateProfile(updates) {
    this.profile.update(updates)
  }

  /**
   * Add link to own profile
   * @param {Object} linkData - Link data
   * @returns {ProfileLink}
   */
  addLink(linkData) {
    return this.profile.addLink(linkData)
  }

  /**
   * Remove link from own profile
   * @param {string} linkId - Link ID
   * @returns {boolean}
   */
  removeLink(linkId) {
    return this.profile.removeLink(linkId)
  }

  /**
   * Get another user's profile (from cache or network)
   * @param {string} nodeId - Node ID
   * @param {Object} options - Options
   * @returns {Object|null}
   */
  getProfile(nodeId, options = {}) {
    // Own profile
    if (nodeId === this.nodeId) {
      return this.profile.toPublic({ requesterId: this.nodeId })
    }

    // Check cache
    const cached = this.cache.get(nodeId)
    if (cached && !options.forceRefresh) {
      return cached
    }

    // Would fetch from network here
    // For now, return null to indicate not cached
    return null
  }

  /**
   * Cache a fetched profile
   * @param {string} nodeId - Node ID
   * @param {Object} profile - Profile data
   */
  cacheProfile(nodeId, profile) {
    this.cache.set(nodeId, profile)
  }

  /**
   * Search profiles (in cache)
   * @param {string} query - Search query
   * @returns {Array<Object>}
   */
  search(query) {
    const lowerQuery = query.toLowerCase()
    const results = []

    // Search cache
    for (const [nodeId, entry] of this.cache.cache) {
      const profile = entry.profile

      if (
        profile.displayName?.toLowerCase().includes(lowerQuery) ||
        profile.bio?.toLowerCase().includes(lowerQuery)
      ) {
        results.push(profile)
      }
    }

    return results
  }

  /**
   * Get manager stats
   * @returns {Object}
   */
  getStats() {
    return {
      nodeId: this.nodeId,
      cacheStats: this.cache.getStats(),
      ownProfileViews: this.profile.profileViews,
      ownLinkCount: this.profile.links.size,
    }
  }

  toJSON() {
    return this.getStats()
  }
}

// Singleton manager instance
let defaultManager = null

/**
 * Get or create the default profile manager
 * @param {Object} options - Options for manager creation
 * @returns {ProfileManager}
 */
function getProfileManager(options = {}) {
  if (!defaultManager && options.nodeId) {
    defaultManager = new ProfileManager(options)
  }
  return defaultManager
}

module.exports = {
  Profile,
  ProfileLink,
  ProfileCache,
  ProfileManager,
  getProfileManager,
}
