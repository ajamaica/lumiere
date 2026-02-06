/**
 * Groups Actions
 *
 * Group management and interaction:
 * - groups.create, groups.list, groups.join
 * - groups.post, groups.react, groups.comment
 *
 * @module @sschepis/alephnet-node/lib/actions/groups
 */

'use strict'

const { getGroupsManager } = require('../groups')

// Initialize manager (lazy)
let groupsManager = null

function initGroupsManager(nodeId, basePath) {
  if (!groupsManager) {
    groupsManager = getGroupsManager({ nodeId, basePath })
  }
  return groupsManager
}

const groupsActions = {
  /**
   * Create a new group
   */
  'groups.create': async (args) => {
    if (!groupsManager) return { error: 'Not initialized' }

    try {
      const group = groupsManager.createGroup({
        name: args.name,
        description: args.description,
        topic: args.topic,
        visibility: args.visibility,
        avatarHash: args.avatarHash,
      })
      return { created: true, group: group.toJSON() }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * List visible groups
   */
  'groups.list': async () => {
    if (!groupsManager) return { error: 'Not initialized' }
    return { groups: groupsManager.listGroups() }
  },

  /**
   * Join a group
   */
  'groups.join': async (args) => {
    if (!groupsManager) return { error: 'Not initialized' }
    if (!args.groupId) return { error: 'groupId is required' }

    try {
      const success = groupsManager.joinGroup(args.groupId)
      return { joined: success, groupId: args.groupId }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Create a post
   */
  'groups.post': async (args) => {
    if (!groupsManager) return { error: 'Not initialized' }
    if (!args.groupId) return { error: 'groupId is required' }

    try {
      const post = groupsManager.createPost(args.groupId, {
        content: args.content,
        media: args.media,
      })
      return { posted: true, post: post.toJSON() }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * React to a post
   */
  'groups.react': async (args) => {
    if (!groupsManager) return { error: 'Not initialized' }
    if (!args.groupId || !args.postId || !args.reaction) {
      return { error: 'groupId, postId, and reaction are required' }
    }

    try {
      groupsManager.addReaction(args.groupId, args.postId, args.reaction)
      return { reacted: true }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Comment on a post
   */
  'groups.comment': async (args) => {
    if (!groupsManager) return { error: 'Not initialized' }
    if (!args.groupId || !args.postId || !args.content) {
      return { error: 'groupId, postId, and content are required' }
    }

    try {
      const comment = groupsManager.addComment(args.groupId, args.postId, args.content)
      return { commented: true, comment: comment.toJSON() }
    } catch (e) {
      return { error: e.message }
    }
  },
}

module.exports = {
  groupsActions,
  initGroupsManager,
}
