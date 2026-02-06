/**
 * Social Actions
 *
 * Friend management and profile capabilities:
 * - friends.list, friends.add, friends.remove, friends.requests, friends.accept
 * - profile.get, profile.update, profile.links.*
 *
 * @module @sschepis/alephnet-node/lib/actions/social
 */

'use strict'

const path = require('path')

// Manager instances (lazily initialized)
let friendsManager = null
let profileManager = null
let dataPath = './data'

/**
 * Initialize managers with node ID
 */
function initManagers(nodeId, basePath = './data') {
  dataPath = basePath

  if (!friendsManager) {
    const { FriendsManager } = require('../friends')
    friendsManager = new FriendsManager({
      nodeId,
      storagePath: path.join(basePath, 'friends', `${nodeId}.json`),
    })
  }

  if (!profileManager) {
    const { ProfileManager } = require('../profiles')
    profileManager = new ProfileManager({
      nodeId,
      basePath: path.join(basePath, 'profiles'),
    })
  }

  return { friendsManager, profileManager }
}

/**
 * Get current managers (for external access)
 */
function getManagers() {
  return { friendsManager, profileManager }
}

// Friend actions
const friendsActions = {
  /**
   * Get friend list
   */
  'friends.list': async (args = {}) => {
    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const friends = friendsManager.list({
      favoritesFirst: args.favoritesFirst ?? true,
      onlineFirst: args.onlineFirst ?? false,
    })

    return {
      friends,
      total: friends.length,
      favorites: friends.filter((f) => f.favorite).length,
    }
  },

  /**
   * Send friend request
   */
  'friends.add': async (args) => {
    const { userId, message = '' } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const request = friendsManager.sendRequest(userId, message)

      return {
        sent: true,
        requestId: request.id,
        to: userId,
        status: 'pending',
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Remove a friend
   */
  'friends.remove': async (args) => {
    const { userId } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const removed = friendsManager.removeFriend(userId)

    return {
      removed,
      userId,
    }
  },

  /**
   * Get pending friend requests
   */
  'friends.requests': async () => {
    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const received = friendsManager.getPendingRequests()
    const sent = friendsManager.getSentRequests()

    return {
      received,
      sent,
      totalPending: received.length + sent.length,
    }
  },

  /**
   * Accept a friend request
   */
  'friends.accept': async (args) => {
    const { requestId } = args

    if (!requestId) {
      return { error: 'requestId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      const friend = friendsManager.acceptRequest(requestId)

      return {
        accepted: true,
        friend: friend.toJSON(),
      }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Reject a friend request
   */
  'friends.reject': async (args) => {
    const { requestId } = args

    if (!requestId) {
      return { error: 'requestId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      friendsManager.rejectRequest(requestId)
      return { rejected: true }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Block a user
   */
  'friends.block': async (args) => {
    const { userId } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    try {
      friendsManager.block(userId)
      return { blocked: true, userId }
    } catch (e) {
      return { error: e.message }
    }
  },

  /**
   * Unblock a user
   */
  'friends.unblock': async (args) => {
    const { userId } = args

    if (!userId) {
      return { error: 'userId is required' }
    }

    if (!friendsManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const unblocked = friendsManager.unblock(userId)
    return { unblocked, userId }
  },
}

// Profile actions
const profileActions = {
  /**
   * Get profile (self or other user)
   */
  'profile.get': async (args = {}) => {
    const { userId } = args

    if (!profileManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    if (!userId) {
      // Return own profile
      return profileManager.getOwnProfile()
    }

    // Get other user's profile
    const isFriend = friendsManager?.isFriend(userId) || false
    const profile = profileManager.getProfile(userId, { isFriend })

    if (!profile) {
      return { error: 'Profile not found or not cached' }
    }

    return profile
  },

  /**
   * Update own profile
   */
  'profile.update': async (args) => {
    if (!profileManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const { displayName, bio, visibility, theme, contact } = args

    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (bio !== undefined) updates.bio = bio
    if (visibility !== undefined) updates.visibility = visibility
    if (theme !== undefined) updates.theme = theme
    if (contact !== undefined) updates.contact = contact

    profileManager.updateProfile(updates)

    return {
      updated: true,
      profile: profileManager.getOwnProfile(),
    }
  },

  /**
   * Add link to profile
   */
  'profile.links.add': async (args) => {
    const { url, title, description = '', type = 'url', visibility = 'public' } = args

    if (!url && type === 'url') {
      return { error: 'url is required' }
    }

    if (!title) {
      return { error: 'title is required' }
    }

    if (!profileManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const link = profileManager.addLink({
      type,
      url,
      title,
      description,
      visibility,
    })

    return {
      added: true,
      link: link.toJSON(),
    }
  },

  /**
   * Remove link from profile
   */
  'profile.links.remove': async (args) => {
    const { linkId } = args

    if (!linkId) {
      return { error: 'linkId is required' }
    }

    if (!profileManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    const removed = profileManager.removeLink(linkId)

    return { removed, linkId }
  },

  /**
   * List profile links
   */
  'profile.links.list': async (args = {}) => {
    const { userId } = args

    if (!profileManager) {
      return { error: 'Not initialized. Call connect() first.' }
    }

    if (!userId) {
      // Own links
      const profile = profileManager.getOwnProfile()
      return { links: profile.links }
    }

    // Other user's links
    const isFriend = friendsManager?.isFriend(userId) || false
    const profile = profileManager.getProfile(userId, { isFriend })

    if (!profile) {
      return { error: 'Profile not found' }
    }

    return { links: profile.links || [] }
  },
}

module.exports = {
  friendsActions,
  profileActions,
  initManagers,
  getManagers,
}
