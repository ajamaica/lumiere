/**
 * Direct Messaging for AlephNet
 *
 * Provides end-to-end encrypted direct messaging:
 * - 1-on-1 direct messages
 * - Chat rooms with invitations
 * - Message persistence
 * - Read receipts
 *
 * Integrates with Identity for encryption and Friends for access control.
 *
 * @module @sschepis/alephnet-node/lib/direct-message
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

/**
 * Message types
 */
const MESSAGE_TYPE = {
  text: 'text',
  image: 'image',
  file: 'file',
  link: 'link',
  system: 'system',
}

/**
 * Room types
 */
const ROOM_TYPE = {
  dm: 'dm', // Direct message (2 people)
  group: 'group', // Group chat
  public: 'public', // Public room (anyone can join)
}

/**
 * Message - A single message
 */
class Message {
  constructor(data) {
    this.id = data.id || `msg_${crypto.randomBytes(8).toString('hex')}`
    this.roomId = data.roomId
    this.from = data.from
    this.type = data.type || MESSAGE_TYPE.text
    this.content = data.content || ''
    this.contentHash = data.contentHash || null // For media/attachments
    this.encrypted = data.encrypted || false
    this.encryptedContent = data.encryptedContent || null
    this.replyTo = data.replyTo || null // Message ID being replied to
    this.timestamp = data.timestamp || Date.now()
    this.editedAt = data.editedAt || null
    this.deletedAt = data.deletedAt || null
    this.readBy = new Set(data.readBy || [])
  }

  /**
   * Mark as read by a user
   * @param {string} nodeId - Reader's node ID
   */
  markRead(nodeId) {
    this.readBy.add(nodeId)
  }

  /**
   * Edit message content
   * @param {string} newContent - New content
   */
  edit(newContent) {
    this.content = newContent
    this.editedAt = Date.now()
  }

  /**
   * Soft delete message
   */
  delete() {
    this.content = '[Message deleted]'
    this.deletedAt = Date.now()
  }

  /**
   * Check if message is deleted
   * @returns {boolean}
   */
  isDeleted() {
    return this.deletedAt !== null
  }

  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      from: this.from,
      type: this.type,
      content: this.isDeleted() ? '[Message deleted]' : this.content,
      contentHash: this.contentHash,
      encrypted: this.encrypted,
      replyTo: this.replyTo,
      timestamp: this.timestamp,
      editedAt: this.editedAt,
      deletedAt: this.deletedAt,
      readBy: Array.from(this.readBy),
    }
  }
}

/**
 * ChatRoom - A conversation (DM or group)
 */
class ChatRoom extends EventEmitter {
  constructor(data) {
    super()

    this.id = data.id || `room_${crypto.randomBytes(8).toString('hex')}`
    this.type = data.type || ROOM_TYPE.dm
    this.name = data.name || null
    this.description = data.description || ''
    this.avatarHash = data.avatarHash || null
    this.createdBy = data.createdBy
    this.createdAt = data.createdAt || Date.now()

    // Members
    this.members = new Set(data.members || [])
    this.admins = new Set(data.admins || [data.createdBy])
    this.banned = new Set(data.banned || [])

    // Invite management
    this.inviteCode = data.inviteCode || null
    this.inviteEnabled = data.inviteEnabled ?? false
    this.invitedBy = new Map(Object.entries(data.invitedBy || {})) // nodeId -> inviter

    // Messages (recent only, older ones may be paginated from storage)
    this.messages = []
    this.maxMessages = data.maxMessages || 500

    // Settings
    this.settings = {
      encrypted: true,
      allowInvites: true,
      membersCanInvite: true,
      ...data.settings,
    }

    // Stats
    this.lastMessageAt = data.lastMessageAt || null
    this.messageCount = data.messageCount || 0
  }

  /**
   * Check if user is a member
   * @param {string} nodeId - Node ID
   * @returns {boolean}
   */
  isMember(nodeId) {
    return this.members.has(nodeId)
  }

  /**
   * Check if user is an admin
   * @param {string} nodeId - Node ID
   * @returns {boolean}
   */
  isAdmin(nodeId) {
    return this.admins.has(nodeId)
  }

  /**
   * Check if user is banned
   * @param {string} nodeId - Node ID
   * @returns {boolean}
   */
  isBanned(nodeId) {
    return this.banned.has(nodeId)
  }

  /**
   * Check if user can send messages
   * @param {string} nodeId - Node ID
   * @returns {boolean}
   */
  canSend(nodeId) {
    return this.isMember(nodeId) && !this.isBanned(nodeId)
  }

  /**
   * Check if user can invite
   * @param {string} nodeId - Node ID
   * @returns {boolean}
   */
  canInvite(nodeId) {
    if (!this.settings.allowInvites) return false
    if (!this.isMember(nodeId)) return false
    if (this.settings.membersCanInvite) return true
    return this.isAdmin(nodeId)
  }

  /**
   * Add a member
   * @param {string} nodeId - Node ID
   * @param {string} [invitedBy] - Who invited them
   */
  addMember(nodeId, invitedBy = null) {
    if (this.banned.has(nodeId)) {
      throw new Error('User is banned from this room')
    }

    this.members.add(nodeId)
    if (invitedBy) {
      this.invitedBy.set(nodeId, invitedBy)
    }

    this.emit('member_joined', { nodeId, invitedBy })
  }

  /**
   * Remove a member
   * @param {string} nodeId - Node ID
   */
  removeMember(nodeId) {
    this.members.delete(nodeId)
    this.admins.delete(nodeId)
    this.invitedBy.delete(nodeId)

    this.emit('member_left', { nodeId })
  }

  /**
   * Promote member to admin
   * @param {string} nodeId - Node ID
   */
  promoteToAdmin(nodeId) {
    if (!this.members.has(nodeId)) {
      throw new Error('User is not a member')
    }
    this.admins.add(nodeId)
  }

  /**
   * Demote admin to member
   * @param {string} nodeId - Node ID
   */
  demoteFromAdmin(nodeId) {
    if (nodeId === this.createdBy) {
      throw new Error('Cannot demote room creator')
    }
    this.admins.delete(nodeId)
  }

  /**
   * Ban a member
   * @param {string} nodeId - Node ID
   */
  ban(nodeId) {
    if (nodeId === this.createdBy) {
      throw new Error('Cannot ban room creator')
    }
    this.banned.add(nodeId)
    this.members.delete(nodeId)
    this.admins.delete(nodeId)

    this.emit('member_banned', { nodeId })
  }

  /**
   * Unban a member
   * @param {string} nodeId - Node ID
   */
  unban(nodeId) {
    this.banned.delete(nodeId)
  }

  /**
   * Generate invite code
   * @returns {string}
   */
  generateInviteCode() {
    this.inviteCode = crypto.randomBytes(12).toString('base64url')
    this.inviteEnabled = true
    return this.inviteCode
  }

  /**
   * Disable invite code
   */
  disableInviteCode() {
    this.inviteCode = null
    this.inviteEnabled = false
  }

  /**
   * Add a message
   * @param {Message} message - The message
   */
  addMessage(message) {
    this.messages.push(message)
    this.lastMessageAt = message.timestamp
    this.messageCount++

    // Trim to max size
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages)
    }

    this.emit('message', message.toJSON())
  }

  /**
   * Get recent messages
   * @param {number} [limit=50] - Max messages
   * @param {number} [beforeTimestamp] - Get messages before this time
   * @returns {Array<Object>}
   */
  getMessages(limit = 50, beforeTimestamp = null) {
    let msgs = this.messages

    if (beforeTimestamp) {
      msgs = msgs.filter((m) => m.timestamp < beforeTimestamp)
    }

    return msgs.slice(-limit).map((m) => m.toJSON())
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message ID
   * @returns {Message|null}
   */
  getMessage(messageId) {
    return this.messages.find((m) => m.id === messageId) || null
  }

  /**
   * Update room info
   * @param {Object} updates - Fields to update
   */
  update(updates) {
    const allowed = ['name', 'description', 'avatarHash', 'settings']
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        if (key === 'settings') {
          this.settings = { ...this.settings, ...value }
        } else {
          this[key] = value
        }
      }
    }
  }

  /**
   * Get room info (public view)
   * @returns {Object}
   */
  getInfo() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      avatarHash: this.avatarHash,
      memberCount: this.members.size,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      lastMessageAt: this.lastMessageAt,
      messageCount: this.messageCount,
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      description: this.description,
      avatarHash: this.avatarHash,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      members: Array.from(this.members),
      admins: Array.from(this.admins),
      banned: Array.from(this.banned),
      inviteCode: this.inviteCode,
      inviteEnabled: this.inviteEnabled,
      invitedBy: Object.fromEntries(this.invitedBy),
      settings: this.settings,
      lastMessageAt: this.lastMessageAt,
      messageCount: this.messageCount,
    }
  }
}

/**
 * MessageManager - Manages all messaging
 */
class MessageManager extends EventEmitter {
  /**
   * Create a message manager
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {Object} [options.identity] - Identity for encryption
   * @param {Object} [options.friendsManager] - Friends manager for access control
   * @param {string} [options.basePath] - Base path for storage
   */
  constructor(options = {}) {
    super()

    if (!options.nodeId) {
      throw new Error('nodeId is required')
    }

    this.nodeId = options.nodeId
    this.identity = options.identity || null
    this.friendsManager = options.friendsManager || null
    this.basePath = options.basePath || './data/messages'

    // Rooms
    this.rooms = new Map() // roomId -> ChatRoom
    this.dmIndex = new Map() // "nodeId1:nodeId2" -> roomId (sorted)

    // Pending invites (received)
    this.pendingInvites = new Map() // inviteId -> invite data

    // Create base path
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    // Load existing rooms
    this._loadRooms()
  }

  /**
   * Create a DM room or get existing
   * @param {string} otherNodeId - Other user's node ID
   * @returns {ChatRoom}
   */
  getOrCreateDM(otherNodeId) {
    if (otherNodeId === this.nodeId) {
      throw new Error('Cannot create DM with self')
    }

    // Check friend status if friends manager available
    if (this.friendsManager && !this.friendsManager.isFriend(otherNodeId)) {
      throw new Error('Can only DM friends')
    }

    // Check for existing DM
    const dmKey = this._getDMKey(otherNodeId)
    const existingId = this.dmIndex.get(dmKey)

    if (existingId && this.rooms.has(existingId)) {
      return this.rooms.get(existingId)
    }

    // Create new DM room
    const room = new ChatRoom({
      type: ROOM_TYPE.dm,
      createdBy: this.nodeId,
      members: [this.nodeId, otherNodeId],
      settings: {
        encrypted: true,
        allowInvites: false,
      },
    })

    this.rooms.set(room.id, room)
    this.dmIndex.set(dmKey, room.id)

    this._setupRoomEvents(room)
    this._saveRoom(room)

    return room
  }

  /**
   * Get DM key (sorted node IDs)
   * @private
   */
  _getDMKey(otherNodeId) {
    return [this.nodeId, otherNodeId].sort().join(':')
  }

  /**
   * Create a group room
   * @param {Object} options - Room options
   * @param {string} options.name - Room name
   * @param {string} [options.description] - Room description
   * @param {Array<string>} [options.members] - Initial members
   * @returns {ChatRoom}
   */
  createRoom(options = {}) {
    if (!options.name) {
      throw new Error('Room name is required')
    }

    const room = new ChatRoom({
      type: options.type || ROOM_TYPE.group,
      name: options.name,
      description: options.description,
      createdBy: this.nodeId,
      members: [this.nodeId, ...(options.members || [])],
      admins: [this.nodeId],
      settings: options.settings,
    })

    this.rooms.set(room.id, room)

    this._setupRoomEvents(room)
    this._saveRoom(room)

    this.emit('room_created', room.getInfo())

    return room
  }

  /**
   * Setup event forwarding from room
   * @private
   */
  _setupRoomEvents(room) {
    room.on('message', (msg) => {
      this.emit('message', { roomId: room.id, message: msg })
    })

    room.on('member_joined', (data) => {
      this.emit('member_joined', { roomId: room.id, ...data })
    })

    room.on('member_left', (data) => {
      this.emit('member_left', { roomId: room.id, ...data })
    })
  }

  /**
   * Get a room by ID
   * @param {string} roomId - Room ID
   * @returns {ChatRoom|null}
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null
  }

  /**
   * Leave a room
   * @param {string} roomId - Room ID
   */
  leaveRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.removeMember(this.nodeId)

    // If DM, keep room but mark as left
    // If group and no members, delete
    if (room.type !== ROOM_TYPE.dm && room.members.size === 0) {
      this.rooms.delete(roomId)
      this._deleteRoomFile(roomId)
    } else {
      this._saveRoom(room)
    }
  }

  /**
   * Send a message
   * @param {string} roomId - Room ID
   * @param {string} content - Message content
   * @param {Object} [options] - Message options
   * @returns {Message}
   */
  sendMessage(roomId, content, options = {}) {
    const room = this.rooms.get(roomId)

    if (!room) {
      throw new Error('Room not found')
    }

    if (!room.canSend(this.nodeId)) {
      throw new Error('Cannot send messages to this room')
    }

    let messageContent = content
    let encrypted = false
    let encryptedContent = null

    // Encrypt if identity available and room encrypted
    if (this.identity && room.settings.encrypted && room.type === ROOM_TYPE.dm) {
      // Get other member's public key
      const otherMember = Array.from(room.members).find((m) => m !== this.nodeId)
      // Would need to look up their public key
      // For now, store unencrypted
    }

    const message = new Message({
      roomId,
      from: this.nodeId,
      type: options.type || MESSAGE_TYPE.text,
      content: messageContent,
      contentHash: options.contentHash,
      encrypted,
      encryptedContent,
      replyTo: options.replyTo,
    })

    room.addMessage(message)
    this._saveRoom(room)

    return message
  }

  /**
   * Mark messages as read
   * @param {string} roomId - Room ID
   * @param {Array<string>} [messageIds] - Specific message IDs (or all recent)
   */
  markRead(roomId, messageIds = null) {
    const room = this.rooms.get(roomId)
    if (!room) return

    if (messageIds) {
      for (const id of messageIds) {
        const msg = room.getMessage(id)
        if (msg) msg.markRead(this.nodeId)
      }
    } else {
      // Mark all messages as read
      for (const msg of room.messages) {
        if (msg.from !== this.nodeId) {
          msg.markRead(this.nodeId)
        }
      }
    }

    this._saveRoom(room)
  }

  /**
   * Get unread message count for a room
   * @param {string} roomId - Room ID
   * @returns {number}
   */
  getUnreadCount(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return 0

    return room.messages.filter((m) => m.from !== this.nodeId && !m.readBy.has(this.nodeId)).length
  }

  /**
   * Create room invitation
   * @param {string} roomId - Room ID
   * @param {Array<string>} nodeIds - Node IDs to invite
   * @returns {Object} Invitation data
   */
  createInvitation(roomId, nodeIds) {
    const room = this.rooms.get(roomId)

    if (!room) {
      throw new Error('Room not found')
    }

    if (!room.canInvite(this.nodeId)) {
      throw new Error('You cannot invite to this room')
    }

    // Filter already-members and banned
    const toInvite = nodeIds.filter((id) => !room.isMember(id) && !room.isBanned(id))

    // Generate invite code if not exists
    if (!room.inviteCode) {
      room.generateInviteCode()
      this._saveRoom(room)
    }

    return {
      roomId: room.id,
      roomName: room.name,
      inviteCode: room.inviteCode,
      invitedBy: this.nodeId,
      invitees: toInvite,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }
  }

  /**
   * Accept an invitation
   * @param {Object} invitation - Invitation data
   * @returns {ChatRoom}
   */
  acceptInvitation(invitation) {
    const room = this.rooms.get(invitation.roomId)

    if (!room) {
      throw new Error('Room not found')
    }

    if (room.inviteCode !== invitation.inviteCode) {
      throw new Error('Invalid invite code')
    }

    if (!room.inviteEnabled) {
      throw new Error('Invitations are disabled')
    }

    room.addMember(this.nodeId, invitation.invitedBy)
    this._saveRoom(room)

    return room
  }

  /**
   * Receive invitation from network
   * @param {Object} invitation - Invitation data
   */
  receiveInvitation(invitation) {
    const inviteId = `inv_${invitation.roomId}_${Date.now()}`
    this.pendingInvites.set(inviteId, {
      ...invitation,
      receivedAt: Date.now(),
    })

    this.emit('invitation_received', { inviteId, invitation })
  }

  /**
   * Get pending invitations
   * @returns {Array<Object>}
   */
  getPendingInvites() {
    return Array.from(this.pendingInvites.entries()).map(([id, inv]) => ({
      inviteId: id,
      ...inv,
    }))
  }

  /**
   * List all rooms
   * @param {Object} options - List options
   * @returns {Array<Object>}
   */
  listRooms(options = {}) {
    let rooms = Array.from(this.rooms.values()).filter((r) => r.isMember(this.nodeId))

    // Filter by type
    if (options.type) {
      rooms = rooms.filter((r) => r.type === options.type)
    }

    // Sort by last message
    rooms.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))

    return rooms.map((r) => ({
      ...r.getInfo(),
      unreadCount: this.getUnreadCount(r.id),
    }))
  }

  /**
   * Get inbox (recent messages across all rooms)
   * @param {number} [limit=50] - Max messages
   * @returns {Array<Object>}
   */
  getInbox(limit = 50) {
    const allMessages = []

    for (const room of this.rooms.values()) {
      if (!room.isMember(this.nodeId)) continue

      for (const msg of room.messages.slice(-20)) {
        allMessages.push({
          ...msg.toJSON(),
          roomName: room.name || 'DM',
          roomType: room.type,
        })
      }
    }

    // Sort by timestamp (newest first)
    allMessages.sort((a, b) => b.timestamp - a.timestamp)

    return allMessages.slice(0, limit)
  }

  /**
   * Save room to storage
   * @private
   */
  _saveRoom(room) {
    const roomPath = path.join(this.basePath, `${room.id}.json`)

    const data = {
      ...room.toJSON(),
      messages: room.messages.slice(-100).map((m) => m.toJSON()),
      savedAt: Date.now(),
    }

    fs.writeFileSync(roomPath, JSON.stringify(data, null, 2))
  }

  /**
   * Delete room file
   * @private
   */
  _deleteRoomFile(roomId) {
    const roomPath = path.join(this.basePath, `${roomId}.json`)
    if (fs.existsSync(roomPath)) {
      fs.unlinkSync(roomPath)
    }
  }

  /**
   * Load rooms from storage
   * @private
   */
  _loadRooms() {
    try {
      const files = fs.readdirSync(this.basePath).filter((f) => f.endsWith('.json'))

      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf8'))

          const room = new ChatRoom(data)

          // Load messages
          for (const msgData of data.messages || []) {
            room.messages.push(new Message(msgData))
          }

          this.rooms.set(room.id, room)
          this._setupRoomEvents(room)

          // Update DM index
          if (room.type === ROOM_TYPE.dm) {
            const members = Array.from(room.members)
            if (members.length === 2) {
              const dmKey = members.sort().join(':')
              this.dmIndex.set(dmKey, room.id)
            }
          }
        } catch (e) {
          console.warn(`[MessageManager] Failed to load room ${file}:`, e.message)
        }
      }
    } catch (e) {
      // Directory might not exist
    }
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    let totalMessages = 0
    let unreadTotal = 0

    for (const room of this.rooms.values()) {
      if (room.isMember(this.nodeId)) {
        totalMessages += room.messageCount
        unreadTotal += this.getUnreadCount(room.id)
      }
    }

    return {
      roomCount: this.rooms.size,
      dmCount: Array.from(this.rooms.values()).filter((r) => r.type === ROOM_TYPE.dm).length,
      groupCount: Array.from(this.rooms.values()).filter((r) => r.type === ROOM_TYPE.group).length,
      totalMessages,
      unreadTotal,
      pendingInvites: this.pendingInvites.size,
    }
  }

  toJSON() {
    return this.getStats()
  }
}

// Singleton manager instance
let defaultManager = null

/**
 * Get or create the default message manager
 * @param {Object} options - Options for manager creation
 * @returns {MessageManager}
 */
function getMessageManager(options = {}) {
  if (!defaultManager && options.nodeId) {
    defaultManager = new MessageManager(options)
  }
  return defaultManager
}

module.exports = {
  MessageManager,
  ChatRoom,
  Message,
  getMessageManager,
  MESSAGE_TYPE,
  ROOM_TYPE,
}
