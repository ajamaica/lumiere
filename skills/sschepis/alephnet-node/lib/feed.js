/**
 * Feed Management for AlephNet
 *
 * Aggregates content from:
 * - Joined groups (posts)
 * - Direct messages (unread/recent)
 * - System announcements
 *
 * @module @sschepis/alephnet-node/lib/feed
 */

'use strict'

class FeedManager {
  /**
   * Create a feed manager
   * @param {Object} options - Configuration options
   * @param {string} options.nodeId - Owner node ID
   * @param {Object} options.groupsManager - Groups manager instance
   * @param {Object} options.messageManager - Message manager instance
   */
  constructor(options = {}) {
    if (!options.nodeId) throw new Error('nodeId is required')

    this.nodeId = options.nodeId
    this.groupsManager = options.groupsManager
    this.messageManager = options.messageManager
  }

  /**
   * Get unified feed
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Max items
   * @param {number} [options.offset] - Pagination offset
   * @returns {Array<Object>} Feed items
   */
  getFeed(options = {}) {
    const limit = options.limit || 50
    const offset = options.offset || 0
    let feedItems = []

    // 1. Get group posts from joined groups
    if (this.groupsManager) {
      // Get all groups we are a member of
      const allGroups = this.groupsManager.listGroups() // Returns JSONs of visible groups

      for (const groupData of allGroups) {
        const group = this.groupsManager.getGroup(groupData.id)
        if (!group) continue

        // If private/invisible, ensure membership (listGroups already filters, but double check)
        if (!group.isMember(this.nodeId) && group.visibility !== 'public') continue

        for (const post of group.posts) {
          feedItems.push({
            id: `feed_${post.id}`,
            type: 'group_post',
            timestamp: post.timestamp,
            source: {
              id: group.id,
              name: group.name,
              type: 'group',
            },
            authorId: post.authorId,
            content: post.toJSON(),
          })
        }
      }
    }

    // 2. Get recent messages
    if (this.messageManager) {
      const inbox = this.messageManager.getInbox(50) // Get recent 50 messages
      for (const msg of inbox) {
        feedItems.push({
          id: `feed_${msg.id}`,
          type: 'message',
          timestamp: msg.timestamp,
          source: {
            id: msg.roomId,
            name: msg.roomName,
            type: 'chat',
          },
          authorId: msg.from,
          content: msg,
          isRead: msg.readBy && msg.readBy.includes(this.nodeId),
        })
      }
    }

    // Sort by timestamp descending (newest first)
    feedItems.sort((a, b) => b.timestamp - a.timestamp)

    // Paginate
    return feedItems.slice(offset, offset + limit)
  }

  /**
   * Get unread summary
   * @returns {Object}
   */
  getUnreadSummary() {
    const summary = {
      totalUnread: 0,
      messages: 0,
      notifications: 0, // Placeholder for future notifications
    }

    if (this.messageManager) {
      const stats = this.messageManager.getStats()
      summary.messages = stats.unreadTotal
      summary.totalUnread += stats.unreadTotal
    }

    // Future: Add unread group posts logic (requires tracking last read time per group)

    return summary
  }
}

let defaultManager = null
function getFeedManager(options = {}) {
  if (!defaultManager && options.nodeId) {
    defaultManager = new FeedManager(options)
  }
  return defaultManager
}

module.exports = {
  FeedManager,
  getFeedManager,
}
