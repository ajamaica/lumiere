/**
 * Feed Actions
 *
 * Feed retrieval and interactions:
 * - feed.get, feed.unread
 *
 * @module @sschepis/alephnet-node/lib/actions/feed
 */

'use strict'

const { getFeedManager } = require('../feed')

// Initialize manager (lazy)
let feedManager = null

function initFeedManager(nodeId, groupsManager, messageManager) {
  if (!feedManager) {
    feedManager = getFeedManager({ nodeId, groupsManager, messageManager })
  }
  return feedManager
}

const feedActions = {
  /**
   * Get unified feed
   */
  'feed.get': async (args = {}) => {
    if (!feedManager) return { error: 'Not initialized' }

    const feed = feedManager.getFeed({
      limit: args.limit,
      offset: args.offset,
    })

    return { feed }
  },

  /**
   * Get unread summary
   */
  'feed.unread': async () => {
    if (!feedManager) return { error: 'Not initialized' }
    return feedManager.getUnreadSummary()
  },
}

module.exports = {
  feedActions,
  initFeedManager,
}
