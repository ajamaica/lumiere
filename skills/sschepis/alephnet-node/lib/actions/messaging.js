/**
 * Messaging Actions
 *
 * Direct messaging and chat room capabilities:
 * - chat.send: Send DM to a friend
 * - chat.inbox: Get recent messages
 * - chat.rooms.*: Room management
 *
 * @module @sschepis/alephnet-node/lib/actions/messaging
 */

'use strict'

const path = require('path')

// Manager instance (lazily initialized)
let messageManager = null
let friendsManager = null
let nodeId = null

/**
 * Initialize manager with node ID and friends
 */
function initManager(id, friends, basePath = './data') {
  nodeId = id
  friendsManager = friends

  if (!messageManager) {
    const { MessageManager } = require('../direct-message')
    messageManager = new MessageManager({
      nodeId: id,
      friendsManager: friends,
      basePath: path.join(basePath, 'messages'),
    })
  }

  return messageManager
}

/**
 * Get current manager
 */
function getManager() {
  return messageManager
}

// Chat actions
const chatActions = {
  /**
   * Send a direct message to a friend
   */
  'chat.send': async (args) => {
    const { userId, message, type = 'text' } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!message) {
      return { error: 'message is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      // Get or create DM room
      const room = messageManager.getOrCreateDM(userId)

      // Send message
      const msg = messageManager.sendMessage(room.id, message, { type })

      return {
        sent: true,
        messageId: msg.id,
        roomId: room.id,
        to: userId,
        timestamp: msg.timestamp,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Get inbox (recent messages across all conversations)
   */
  'chat.inbox': async (args = {}) => {
    const { limit = 50 } = args

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const messages = messageManager.getInbox(limit)
    const stats = messageManager.getStats()

    return {
      messages,
      unreadTotal: stats.unreadTotal,
      roomCount: stats.roomCount,
    }
  },

  /**
   * Get messages from a specific conversation
   */
  'chat.history': async (args) => {
    const { roomId, userId, limit = 50, before } = args

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    let room

    if (roomId) {
      room = messageManager.getRoom(roomId)
    } else if (userId) {
      // Get DM room with this user
      try {
        room = messageManager.getOrCreateDM(userId)
      } catch (e) {
        return { error: e.message }
      }
    } else {
      return { error: 'roomId or userId is required' }
    }

    if (!room) {
      return { error: 'Room not found' }
    }

    const messages = room.getMessages(limit, before)
    const unread = messageManager.getUnreadCount(room.id)

    return {
      roomId: room.id,
      messages,
      unread,
      total: room.messageCount,
    }
  },

  /**
   * Mark messages as read
   */
  'chat.markRead': async (args) => {
    const { roomId, messageIds } = args

    if (!roomId) {
      return { error: 'roomId is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    messageManager.markRead(roomId, messageIds)

    return {
      marked: true,
      roomId,
    }
  },
}

// Room actions
const roomActions = {
  /**
   * Create a chat room
   */
  'chat.rooms.create': async (args) => {
    const { name, description = '', members = [] } = args

    if (!name) {
      return { error: 'name is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const room = messageManager.createRoom({
        name,
        description,
        members,
      })

      return {
        created: true,
        roomId: room.id,
        name: room.name,
        members: Array.from(room.members),
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Create invite for a room
   */
  'chat.rooms.invite': async (args) => {
    const { roomId, userIds } = args

    if (!roomId) {
      return { error: 'roomId is required' }
    }

    if (!userIds || !userIds.length) {
      return { error: 'userIds is required (array)' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const invitation = messageManager.createInvitation(roomId, userIds)

      return {
        created: true,
        invitation: {
          roomId: invitation.roomId,
          roomName: invitation.roomName,
          inviteCode: invitation.inviteCode,
          invitees: invitation.invitees,
          expiresAt: invitation.expiresAt,
        },
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Join a room via invite code
   */
  'chat.rooms.join': async (args) => {
    const { inviteCode, roomId } = args

    if (!inviteCode || !roomId) {
      return { error: 'inviteCode and roomId are required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const room = messageManager.acceptInvitation({
        roomId,
        inviteCode,
      })

      return {
        joined: true,
        roomId: room.id,
        name: room.name,
        memberCount: room.members.size,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * List rooms
   */
  'chat.rooms.list': async (args = {}) => {
    const { type } = args

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const rooms = messageManager.listRooms({ type })

    return {
      rooms,
      total: rooms.length,
      dmCount: rooms.filter((r) => r.type === 'dm').length,
      groupCount: rooms.filter((r) => r.type === 'group').length,
    }
  },

  /**
   * Leave a room
   */
  'chat.rooms.leave': async (args) => {
    const { roomId } = args

    if (!roomId) {
      return { error: 'roomId is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    messageManager.leaveRoom(roomId)

    return {
      left: true,
      roomId,
    }
  },

  /**
   * Send message to a room
   */
  'chat.rooms.send': async (args) => {
    const { roomId, message, type = 'text', replyTo } = args

    if (!roomId) {
      return { error: 'roomId is required' }
    }

    if (!message) {
      return { error: 'message is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const msg = messageManager.sendMessage(roomId, message, { type, replyTo })

      return {
        sent: true,
        messageId: msg.id,
        roomId,
        timestamp: msg.timestamp,
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Get room info
   */
  'chat.rooms.get': async (args) => {
    const { roomId } = args

    if (!roomId) {
      return { error: 'roomId is required' }
    }

    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const room = messageManager.getRoom(roomId)

    if (!room) {
      return { error: 'Room not found' }
    }

    return {
      ...room.getInfo(),
      members: Array.from(room.members),
      admins: Array.from(room.admins),
      unread: messageManager.getUnreadCount(roomId),
    }
  },

  /**
   * Get pending invitations
   */
  'chat.rooms.invites': async () => {
    if (!messageManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const invites = messageManager.getPendingInvites()

    return {
      invites,
      total: invites.length,
    }
  },
}

module.exports = {
  chatActions,
  roomActions,
  initManager,
  getManager,
}
