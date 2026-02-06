/**
 * Friends Management for AlephNet
 *
 * Manages social relationships:
 * - Friend list (bidirectional relationships)
 * - Friend requests (sent/received)
 * - Blocking
 * - Friend discovery
 *
 * @module @sschepis/alephnet-node/lib/friends
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

/**
 * Relationship status
 */
const RELATIONSHIP_STATUS = {
  none: 'none',
  pending_sent: 'pending_sent',
  pending_received: 'pending_received',
  friends: 'friends',
  blocked: 'blocked',
}

/**
 * FriendRequest - Represents a pending friend request
 */
class FriendRequest {
  constructor(data) {
    this.id = data.id || `req_${crypto.randomBytes(8).toString('hex')}`
    this.from = data.from
    this.to = data.to
    this.message = data.message || ''
    this.status = data.status || 'pending' // pending, accepted, rejected, cancelled
    this.createdAt = data.createdAt || Date.now()
    this.respondedAt = data.respondedAt || null
  }

  accept() {
    this.status = 'accepted'
    this.respondedAt = Date.now()
  }

  reject() {
    this.status = 'rejected'
    this.respondedAt = Date.now()
  }

  cancel() {
    this.status = 'cancelled'
    this.respondedAt = Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      message: this.message,
      status: this.status,
      createdAt: this.createdAt,
      respondedAt: this.respondedAt,
    }
  }
}

/**
 * Friend - Represents a friend relationship
 */
class Friend {
  constructor(data) {
    this.nodeId = data.nodeId
    this.displayName = data.displayName || null
    this.publicKey = data.publicKey || null
    this.fingerprint = data.fingerprint || null
    this.addedAt = data.addedAt || Date.now()
    this.lastSeen = data.lastSeen || null
    this.lastMessage = data.lastMessage || null
    this.nickname = data.nickname || null // Local nickname
    this.notes = data.notes || '' // Private notes
    this.favorite = data.favorite || false
  }

  /**
   * Update friend info (from network)
   */
  update(info) {
    if (info.displayName) this.displayName = info.displayName
    if (info.publicKey) this.publicKey = info.publicKey
    if (info.fingerprint) this.fingerprint = info.fingerprint
    this.lastSeen = Date.now()
  }

  toJSON() {
    return {
      nodeId: this.nodeId,
      displayName: this.displayName,
      publicKey: this.publicKey,
      fingerprint: this.fingerprint,
      addedAt: this.addedAt,
      lastSeen: this.lastSeen,
      lastMessage: this.lastMessage,
      nickname: this.nickname,
      notes: this.notes,
      favorite: this.favorite,
    }
  }
}

/**
 * FriendsManager - Manages friend relationships
 */
class FriendsManager extends EventEmitter {
  /**
   * Create a friends manager
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {string} [options.storagePath] - Path to store data
   */
  constructor(options = {}) {
    super()

    if (!options.nodeId) {
      throw new Error('nodeId is required')
    }

    this.nodeId = options.nodeId
    this.storagePath = options.storagePath || null

    // State
    this.friends = new Map() // nodeId -> Friend
    this.blocked = new Set() // nodeId
    this.sentRequests = new Map() // requestId -> FriendRequest
    this.receivedRequests = new Map() // requestId -> FriendRequest

    // Load if storage exists
    if (this.storagePath && fs.existsSync(this.storagePath)) {
      this.load()
    }
  }

  /**
   * Get relationship status with a node
   * @param {string} nodeId - Target node ID
   * @returns {string} Relationship status
   */
  getRelationship(nodeId) {
    if (nodeId === this.nodeId) {
      return 'self'
    }

    if (this.blocked.has(nodeId)) {
      return RELATIONSHIP_STATUS.blocked
    }

    if (this.friends.has(nodeId)) {
      return RELATIONSHIP_STATUS.friends
    }

    // Check pending requests
    for (const req of this.sentRequests.values()) {
      if (req.to === nodeId && req.status === 'pending') {
        return RELATIONSHIP_STATUS.pending_sent
      }
    }

    for (const req of this.receivedRequests.values()) {
      if (req.from === nodeId && req.status === 'pending') {
        return RELATIONSHIP_STATUS.pending_received
      }
    }

    return RELATIONSHIP_STATUS.none
  }

  /**
   * Check if node is a friend
   * @param {string} nodeId - Target node ID
   * @returns {boolean}
   */
  isFriend(nodeId) {
    return this.friends.has(nodeId)
  }

  /**
   * Check if node is blocked
   * @param {string} nodeId - Target node ID
   * @returns {boolean}
   */
  isBlocked(nodeId) {
    return this.blocked.has(nodeId)
  }

  /**
   * Send a friend request
   * @param {string} toNodeId - Target node ID
   * @param {string} [message] - Optional message
   * @returns {FriendRequest}
   */
  sendRequest(toNodeId, message = '') {
    if (toNodeId === this.nodeId) {
      throw new Error('Cannot send friend request to self')
    }

    if (this.blocked.has(toNodeId)) {
      throw new Error('Cannot send request to blocked user')
    }

    if (this.friends.has(toNodeId)) {
      throw new Error('Already friends')
    }

    // Check for existing pending request
    for (const req of this.sentRequests.values()) {
      if (req.to === toNodeId && req.status === 'pending') {
        throw new Error('Request already pending')
      }
    }

    const request = new FriendRequest({
      from: this.nodeId,
      to: toNodeId,
      message,
    })

    this.sentRequests.set(request.id, request)
    this._save()

    this.emit('request_sent', request.toJSON())

    return request
  }

  /**
   * Receive a friend request (from network)
   * @param {Object} requestData - Request data
   * @returns {FriendRequest}
   */
  receiveRequest(requestData) {
    if (requestData.to !== this.nodeId) {
      throw new Error('Request not for this node')
    }

    if (this.blocked.has(requestData.from)) {
      // Silently ignore blocked users
      return null
    }

    if (this.friends.has(requestData.from)) {
      // Already friends, auto-accept
      return null
    }

    const request = new FriendRequest(requestData)
    this.receivedRequests.set(request.id, request)
    this._save()

    this.emit('request_received', request.toJSON())

    return request
  }

  /**
   * Accept a friend request
   * @param {string} requestId - Request ID
   * @returns {Friend}
   */
  acceptRequest(requestId) {
    const request = this.receivedRequests.get(requestId)

    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== 'pending') {
      throw new Error(`Request already ${request.status}`)
    }

    request.accept()

    // Create friend entry
    const friend = new Friend({
      nodeId: request.from,
      addedAt: Date.now(),
    })

    this.friends.set(friend.nodeId, friend)
    this._save()

    this.emit('request_accepted', {
      request: request.toJSON(),
      friend: friend.toJSON(),
    })

    return friend
  }

  /**
   * Reject a friend request
   * @param {string} requestId - Request ID
   */
  rejectRequest(requestId) {
    const request = this.receivedRequests.get(requestId)

    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== 'pending') {
      throw new Error(`Request already ${request.status}`)
    }

    request.reject()
    this._save()

    this.emit('request_rejected', request.toJSON())
  }

  /**
   * Cancel a sent friend request
   * @param {string} requestId - Request ID
   */
  cancelRequest(requestId) {
    const request = this.sentRequests.get(requestId)

    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== 'pending') {
      throw new Error(`Request already ${request.status}`)
    }

    request.cancel()
    this._save()

    this.emit('request_cancelled', request.toJSON())
  }

  /**
   * Handle request acceptance notification (from network)
   * @param {string} requestId - Request ID
   * @param {Object} friendInfo - Friend info from accepter
   * @returns {Friend}
   */
  handleRequestAccepted(requestId, friendInfo = {}) {
    const request = this.sentRequests.get(requestId)

    if (!request) {
      // May have been a direct add - create friend anyway
      const friend = new Friend({
        nodeId: friendInfo.nodeId,
        displayName: friendInfo.displayName,
        publicKey: friendInfo.publicKey,
        fingerprint: friendInfo.fingerprint,
        addedAt: Date.now(),
      })

      this.friends.set(friend.nodeId, friend)
      this._save()

      this.emit('friend_added', friend.toJSON())
      return friend
    }

    request.accept()

    const friend = new Friend({
      nodeId: request.to,
      displayName: friendInfo.displayName,
      publicKey: friendInfo.publicKey,
      fingerprint: friendInfo.fingerprint,
      addedAt: Date.now(),
    })

    this.friends.set(friend.nodeId, friend)
    this._save()

    this.emit('friend_added', friend.toJSON())

    return friend
  }

  /**
   * Remove a friend
   * @param {string} nodeId - Friend's node ID
   * @returns {boolean}
   */
  removeFriend(nodeId) {
    if (!this.friends.has(nodeId)) {
      return false
    }

    const friend = this.friends.get(nodeId)
    this.friends.delete(nodeId)
    this._save()

    this.emit('friend_removed', friend.toJSON())

    return true
  }

  /**
   * Block a user
   * @param {string} nodeId - Node ID to block
   */
  block(nodeId) {
    if (nodeId === this.nodeId) {
      throw new Error('Cannot block self')
    }

    // Remove from friends if present
    this.friends.delete(nodeId)

    // Cancel any pending requests
    for (const [id, req] of this.sentRequests) {
      if (req.to === nodeId && req.status === 'pending') {
        req.cancel()
      }
    }
    for (const [id, req] of this.receivedRequests) {
      if (req.from === nodeId && req.status === 'pending') {
        req.reject()
      }
    }

    this.blocked.add(nodeId)
    this._save()

    this.emit('blocked', nodeId)
  }

  /**
   * Unblock a user
   * @param {string} nodeId - Node ID to unblock
   */
  unblock(nodeId) {
    const wasBlocked = this.blocked.delete(nodeId)

    if (wasBlocked) {
      this._save()
      this.emit('unblocked', nodeId)
    }

    return wasBlocked
  }

  /**
   * Update friend info
   * @param {string} nodeId - Friend's node ID
   * @param {Object} info - Info to update
   */
  updateFriend(nodeId, info) {
    const friend = this.friends.get(nodeId)

    if (!friend) {
      return false
    }

    friend.update(info)
    this._save()

    return true
  }

  /**
   * Set local nickname for a friend
   * @param {string} nodeId - Friend's node ID
   * @param {string} nickname - Local nickname
   */
  setNickname(nodeId, nickname) {
    const friend = this.friends.get(nodeId)

    if (!friend) {
      throw new Error('Not a friend')
    }

    friend.nickname = nickname
    this._save()
  }

  /**
   * Set friend as favorite
   * @param {string} nodeId - Friend's node ID
   * @param {boolean} favorite - Favorite status
   */
  setFavorite(nodeId, favorite) {
    const friend = this.friends.get(nodeId)

    if (!friend) {
      throw new Error('Not a friend')
    }

    friend.favorite = favorite
    this._save()
  }

  /**
   * Get friend list
   * @param {Object} options - Query options
   * @param {boolean} [options.favoritesFirst] - Sort favorites first
   * @param {boolean} [options.onlineFirst] - Sort by last seen
   * @returns {Array<Object>}
   */
  list(options = {}) {
    let friends = Array.from(this.friends.values())

    // Sort
    if (options.favoritesFirst) {
      friends.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
    }

    if (options.onlineFirst) {
      friends.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    }

    return friends.map((f) => f.toJSON())
  }

  /**
   * Get pending friend requests (received)
   * @returns {Array<Object>}
   */
  getPendingRequests() {
    return Array.from(this.receivedRequests.values())
      .filter((r) => r.status === 'pending')
      .map((r) => r.toJSON())
  }

  /**
   * Get sent friend requests (pending)
   * @returns {Array<Object>}
   */
  getSentRequests() {
    return Array.from(this.sentRequests.values())
      .filter((r) => r.status === 'pending')
      .map((r) => r.toJSON())
  }

  /**
   * Get blocked users
   * @returns {Array<string>}
   */
  getBlocked() {
    return Array.from(this.blocked)
  }

  /**
   * Get friend by node ID
   * @param {string} nodeId - Friend's node ID
   * @returns {Object|null}
   */
  getFriend(nodeId) {
    const friend = this.friends.get(nodeId)
    return friend ? friend.toJSON() : null
  }

  /**
   * Get set of friend node IDs (for access checks)
   * @returns {Set<string>}
   */
  getFriendIds() {
    return new Set(this.friends.keys())
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    const favorites = Array.from(this.friends.values()).filter((f) => f.favorite).length

    return {
      totalFriends: this.friends.size,
      favorites,
      pendingReceived: this.getPendingRequests().length,
      pendingSent: this.getSentRequests().length,
      blocked: this.blocked.size,
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
      friends: Array.from(this.friends.values()).map((f) => f.toJSON()),
      blocked: Array.from(this.blocked),
      sentRequests: Array.from(this.sentRequests.values()).map((r) => r.toJSON()),
      receivedRequests: Array.from(this.receivedRequests.values()).map((r) => r.toJSON()),
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

      // Load friends
      for (const f of data.friends || []) {
        this.friends.set(f.nodeId, new Friend(f))
      }

      // Load blocked
      for (const nodeId of data.blocked || []) {
        this.blocked.add(nodeId)
      }

      // Load requests
      for (const r of data.sentRequests || []) {
        this.sentRequests.set(r.id, new FriendRequest(r))
      }
      for (const r of data.receivedRequests || []) {
        this.receivedRequests.set(r.id, new FriendRequest(r))
      }
    } catch (e) {
      console.warn('[FriendsManager] Failed to load:', e.message)
    }
  }

  toJSON() {
    return this.getStats()
  }
}

// Singleton manager instance
let defaultManager = null

/**
 * Get or create the default friends manager
 * @param {Object} options - Options for manager creation
 * @returns {FriendsManager}
 */
function getFriendsManager(options = {}) {
  if (!defaultManager && options.nodeId) {
    defaultManager = new FriendsManager(options)
  }
  return defaultManager
}

module.exports = {
  FriendsManager,
  FriendRequest,
  Friend,
  getFriendsManager,
  RELATIONSHIP_STATUS,
}
