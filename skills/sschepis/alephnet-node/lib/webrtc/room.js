/**
 * Room Manager for WebRTC Coordinator
 *
 * Manages peer rooms for WebRTC signaling:
 * - Room membership tracking
 * - Peer metadata storage
 * - Room-based broadcasting
 */

const { EventEmitter } = require('events')
const { createLogger } = require('../app/constants')

const log = createLogger('webrtc:room')

/**
 * Represents a single room
 */
class Room {
  constructor(name, options = {}) {
    this.name = name
    this.peers = new Map() // peerId -> { metadata, joinedAt, lastSeen }
    this.maxPeers = options.maxPeers || 50
    this.createdAt = Date.now()
  }

  /**
   * Add a peer to the room
   * @param {string} peerId - Peer identifier
   * @param {Object} metadata - Peer metadata
   * @returns {boolean} Success
   */
  addPeer(peerId, metadata = {}) {
    if (this.peers.size >= this.maxPeers) {
      log('Room full:', this.name, 'max:', this.maxPeers)
      return false
    }

    this.peers.set(peerId, {
      metadata,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    })

    log('Peer joined room:', peerId, '->', this.name)
    return true
  }

  /**
   * Remove a peer from the room
   * @param {string} peerId - Peer identifier
   * @returns {boolean} Whether peer was in room
   */
  removePeer(peerId) {
    const existed = this.peers.has(peerId)
    this.peers.delete(peerId)

    if (existed) {
      log('Peer left room:', peerId, '<-', this.name)
    }

    return existed
  }

  /**
   * Check if peer is in room
   * @param {string} peerId - Peer identifier
   * @returns {boolean}
   */
  hasPeer(peerId) {
    return this.peers.has(peerId)
  }

  /**
   * Get peer info
   * @param {string} peerId - Peer identifier
   * @returns {Object|null}
   */
  getPeer(peerId) {
    return this.peers.get(peerId) || null
  }

  /**
   * Update peer's lastSeen timestamp
   * @param {string} peerId - Peer identifier
   */
  touchPeer(peerId) {
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.lastSeen = Date.now()
    }
  }

  /**
   * Get all peers in the room
   * @returns {Array} Array of { peerId, ...peerInfo }
   */
  getAllPeers() {
    const result = []
    for (const [peerId, info] of this.peers) {
      result.push({
        peerId,
        ...info,
      })
    }
    return result
  }

  /**
   * Get peer IDs only
   * @returns {Array<string>}
   */
  getPeerIds() {
    return Array.from(this.peers.keys())
  }

  /**
   * Get room size
   * @returns {number}
   */
  get size() {
    return this.peers.size
  }

  /**
   * Check if room is empty
   * @returns {boolean}
   */
  get isEmpty() {
    return this.peers.size === 0
  }

  /**
   * Remove stale peers (not seen within timeout)
   * @param {number} timeout - Timeout in ms (default: 60000)
   * @returns {Array<string>} Removed peer IDs
   */
  cleanupStale(timeout = 60000) {
    const now = Date.now()
    const removed = []

    for (const [peerId, info] of this.peers) {
      if (now - info.lastSeen > timeout) {
        this.peers.delete(peerId)
        removed.push(peerId)
      }
    }

    if (removed.length > 0) {
      log('Cleaned stale peers from', this.name, ':', removed.length)
    }

    return removed
  }

  toJSON() {
    return {
      name: this.name,
      peerCount: this.peers.size,
      maxPeers: this.maxPeers,
      createdAt: this.createdAt,
      peers: this.getAllPeers(),
    }
  }
}

/**
 * Room Manager - manages multiple rooms
 */
class RoomManager extends EventEmitter {
  constructor(options = {}) {
    super()

    this.rooms = new Map() // roomName -> Room
    this.peerRooms = new Map() // peerId -> Set<roomName>
    this.defaultMaxPeers = options.defaultMaxPeers || 50
    this.peerTimeout = options.peertimeout || 120000

    // Default rooms
    this.defaultRooms = options.defaultRooms || ['global', 'memory-sync', 'learning']

    // Create default rooms
    for (const roomName of this.defaultRooms) {
      this.getOrCreateRoom(roomName)
    }

    // Cleanup timer
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000)

    log('RoomManager initialized with rooms:', this.defaultRooms.join(', '))
  }

  /**
   * Get or create a room
   * @param {string} roomName - Room name
   * @returns {Room}
   */
  getOrCreateRoom(roomName) {
    let room = this.rooms.get(roomName)
    if (!room) {
      room = new Room(roomName, { maxPeers: this.defaultMaxPeers })
      this.rooms.set(roomName, room)
      log('Room created:', roomName)
      this.emit('room-created', roomName)
    }
    return room
  }

  /**
   * Get a room (without creating)
   * @param {string} roomName - Room name
   * @returns {Room|null}
   */
  getRoom(roomName) {
    return this.rooms.get(roomName) || null
  }

  /**
   * Join a peer to a room
   * @param {string} peerId - Peer identifier
   * @param {string} roomName - Room name
   * @param {Object} metadata - Peer metadata
   * @returns {Object} Result with success and peers
   */
  joinRoom(peerId, roomName, metadata = {}) {
    const room = this.getOrCreateRoom(roomName)

    // Get other peers before joining (for notification)
    const existingPeers = room.getAllPeers()

    const success = room.addPeer(peerId, metadata)

    if (success) {
      // Track rooms for this peer
      if (!this.peerRooms.has(peerId)) {
        this.peerRooms.set(peerId, new Set())
      }
      this.peerRooms.get(peerId).add(roomName)

      this.emit('peer-joined', { peerId, room: roomName, metadata })
    }

    return {
      success,
      room: roomName,
      peers: existingPeers.filter((p) => p.peerId !== peerId),
    }
  }

  /**
   * Leave a peer from a room
   * @param {string} peerId - Peer identifier
   * @param {string} roomName - Room name
   * @returns {boolean} Whether peer was in room
   */
  leaveRoom(peerId, roomName) {
    const room = this.rooms.get(roomName)
    if (!room) return false

    const existed = room.removePeer(peerId)

    if (existed) {
      const peerRoomSet = this.peerRooms.get(peerId)
      if (peerRoomSet) {
        peerRoomSet.delete(roomName)
        if (peerRoomSet.size === 0) {
          this.peerRooms.delete(peerId)
        }
      }

      this.emit('peer-left', { peerId, room: roomName })

      // Remove empty non-default rooms
      if (room.isEmpty && !this.defaultRooms.includes(roomName)) {
        this.rooms.delete(roomName)
        log('Empty room removed:', roomName)
        this.emit('room-removed', roomName)
      }
    }

    return existed
  }

  /**
   * Leave all rooms for a peer
   * @param {string} peerId - Peer identifier
   * @returns {Array<string>} Rooms that were left
   */
  leaveAllRooms(peerId) {
    const roomsLeft = []
    const peerRoomSet = this.peerRooms.get(peerId)

    if (peerRoomSet) {
      for (const roomName of peerRoomSet) {
        const room = this.rooms.get(roomName)
        if (room && room.removePeer(peerId)) {
          roomsLeft.push(roomName)
          this.emit('peer-left', { peerId, room: roomName })
        }
      }
      this.peerRooms.delete(peerId)
    }

    return roomsLeft
  }

  /**
   * Touch peer (update lastSeen) in all their rooms
   * @param {string} peerId - Peer identifier
   */
  touchPeer(peerId) {
    const peerRoomSet = this.peerRooms.get(peerId)
    if (peerRoomSet) {
      for (const roomName of peerRoomSet) {
        const room = this.rooms.get(roomName)
        if (room) {
          room.touchPeer(peerId)
        }
      }
    }
  }

  /**
   * Get all rooms a peer is in
   * @param {string} peerId - Peer identifier
   * @returns {Array<string>} Room names
   */
  getPeerRooms(peerId) {
    const peerRoomSet = this.peerRooms.get(peerId)
    return peerRoomSet ? Array.from(peerRoomSet) : []
  }

  /**
   * Get peers in a room
   * @param {string} roomName - Room name
   * @returns {Array} Peers
   */
  getRoomPeers(roomName) {
    const room = this.rooms.get(roomName)
    return room ? room.getAllPeers() : []
  }

  /**
   * Check if peer is in a specific room
   * @param {string} peerId - Peer identifier
   * @param {string} roomName - Room name
   * @returns {boolean}
   */
  isPeerInRoom(peerId, roomName) {
    const room = this.rooms.get(roomName)
    return room ? room.hasPeer(peerId) : false
  }

  /**
   * Cleanup stale peers from all rooms
   */
  cleanup() {
    const allRemoved = []

    for (const [roomName, room] of this.rooms) {
      const removed = room.cleanupStale(this.peerTimeout)
      for (const peerId of removed) {
        allRemoved.push({ peerId, room: roomName })

        const peerRoomSet = this.peerRooms.get(peerId)
        if (peerRoomSet) {
          peerRoomSet.delete(roomName)
          if (peerRoomSet.size === 0) {
            this.peerRooms.delete(peerId)
          }
        }

        this.emit('peer-left', { peerId, room: roomName, reason: 'timeout' })
      }

      // Remove empty non-default rooms
      if (room.isEmpty && !this.defaultRooms.includes(roomName)) {
        this.rooms.delete(roomName)
        this.emit('room-removed', roomName)
      }
    }

    if (allRemoved.length > 0) {
      log('Cleanup removed', allRemoved.length, 'stale peers')
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      roomCount: this.rooms.size,
      totalPeers: this.peerRooms.size,
      rooms: {},
    }

    for (const [name, room] of this.rooms) {
      stats.rooms[name] = room.size
    }

    return stats
  }

  /**
   * Get room list
   * @returns {Array<string>}
   */
  getRoomList() {
    return Array.from(this.rooms.keys())
  }

  /**
   * Destroy the room manager
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.rooms.clear()
    this.peerRooms.clear()
    this.removeAllListeners()
    log('RoomManager destroyed')
  }

  toJSON() {
    return {
      ...this.getStats(),
      defaultRooms: this.defaultRooms,
    }
  }
}

module.exports = { Room, RoomManager }
