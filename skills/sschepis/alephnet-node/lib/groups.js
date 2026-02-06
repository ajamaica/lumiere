/**
 * Groups Management for AlephNet
 *
 * Manages social groups:
 * - Group creation and discovery
 * - Visibility controls (public, invisible, private)
 * - Content posting (text, media)
 * - Member management
 * - Reactions and comments
 *
 * @module @sschepis/alephnet-node/lib/groups
 */

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')

const GROUP_VISIBILITY = {
  public: 'public', // Anyone can join and view
  invisible: 'invisible', // Join with ID, not listed
  private: 'private', // Invite only
}

/**
 * GroupPost - Represents a content post in a group
 */
class GroupPost {
  constructor(data) {
    this.id = data.id || `post_${crypto.randomBytes(8).toString('hex')}`
    this.groupId = data.groupId
    this.authorId = data.authorId
    this.content = data.content || ''
    this.media = data.media || [] // Array of { type, hash, metadata }
    this.timestamp = data.timestamp || Date.now()
    this.reactions = data.reactions || {} // userId -> reactionType
    this.comments = (data.comments || []).map((c) => new GroupComment(c))
  }

  addReaction(userId, reaction) {
    this.reactions[userId] = reaction
  }

  removeReaction(userId) {
    delete this.reactions[userId]
  }

  addComment(comment) {
    this.comments.push(comment)
  }

  toJSON() {
    return {
      id: this.id,
      groupId: this.groupId,
      authorId: this.authorId,
      content: this.content,
      media: this.media,
      timestamp: this.timestamp,
      reactions: this.reactions,
      comments: this.comments.map((c) => c.toJSON()),
    }
  }
}

/**
 * GroupComment - A comment on a post
 */
class GroupComment {
  constructor(data) {
    this.id = data.id || `cmt_${crypto.randomBytes(8).toString('hex')}`
    this.authorId = data.authorId
    this.content = data.content
    this.timestamp = data.timestamp || Date.now()
  }

  toJSON() {
    return {
      id: this.id,
      authorId: this.authorId,
      content: this.content,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Group - Represents a social group
 */
class Group {
  constructor(data) {
    this.id = data.id || `group_${crypto.randomBytes(8).toString('hex')}`
    this.name = data.name
    this.description = data.description || ''
    this.topic = data.topic || ''
    this.ownerId = data.ownerId
    this.visibility = data.visibility || GROUP_VISIBILITY.public
    this.avatarHash = data.avatarHash || null
    this.members = new Set(data.members || [data.ownerId])
    this.admins = new Set(data.admins || [data.ownerId])
    this.posts = (data.posts || []).map((p) => new GroupPost(p))
    this.createdAt = data.createdAt || Date.now()
  }

  isMember(userId) {
    return this.members.has(userId)
  }

  addMember(userId) {
    this.members.add(userId)
  }

  removeMember(userId) {
    this.members.delete(userId)
    this.admins.delete(userId)
  }

  addPost(post) {
    this.posts.push(post)
    // Sort by timestamp descending? Or keep append order.
    // Usually append, but display might be reverse.
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      topic: this.topic,
      ownerId: this.ownerId,
      visibility: this.visibility,
      avatarHash: this.avatarHash,
      members: Array.from(this.members),
      admins: Array.from(this.admins),
      posts: this.posts.map((p) => p.toJSON()),
      createdAt: this.createdAt,
    }
  }
}

/**
 * GroupsManager - Manages groups
 */
class GroupsManager extends EventEmitter {
  constructor(options = {}) {
    super()

    if (!options.nodeId) throw new Error('nodeId is required')

    this.nodeId = options.nodeId
    this.basePath = options.basePath || './data/groups'
    this.groups = new Map() // id -> Group

    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    this._loadGroups()
    this._ensureDefaultGroups()
  }

  _loadGroups() {
    try {
      const files = fs.readdirSync(this.basePath).filter((f) => f.endsWith('.json'))
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.basePath, file), 'utf8'))
          const group = new Group(data)
          this.groups.set(group.id, group)
        } catch (e) {
          console.warn(`[GroupsManager] Failed to load group ${file}:`, e.message)
        }
      }
    } catch (e) {
      // Directory might not exist yet
    }
  }

  _saveGroup(group) {
    fs.writeFileSync(
      path.join(this.basePath, `${group.id}.json`),
      JSON.stringify(group.toJSON(), null, 2),
    )
  }

  _ensureDefaultGroups() {
    // Default public group
    if (!Array.from(this.groups.values()).find((g) => g.name === 'Public Square')) {
      this.createGroup({
        name: 'Public Square',
        description: 'The default public gathering place for all agents.',
        topic: 'General',
        visibility: GROUP_VISIBILITY.public,
        ownerId: 'system', // Special system owner
      })
    }

    // Default announcements group
    if (!Array.from(this.groups.values()).find((g) => g.name === 'Announcements')) {
      this.createGroup({
        name: 'Announcements',
        description: 'New public groups and system updates.',
        topic: 'System',
        visibility: GROUP_VISIBILITY.public,
        ownerId: 'system',
      })
    }
  }

  createGroup(options) {
    const group = new Group({
      name: options.name,
      description: options.description,
      topic: options.topic,
      ownerId: options.ownerId || this.nodeId,
      visibility: options.visibility || GROUP_VISIBILITY.public,
      avatarHash: options.avatarHash,
    })

    this.groups.set(group.id, group)
    this._saveGroup(group)

    // Announce if public
    if (group.visibility === GROUP_VISIBILITY.public && group.ownerId !== 'system') {
      const announcements = Array.from(this.groups.values()).find((g) => g.name === 'Announcements')
      if (announcements) {
        this.createPost(announcements.id, {
          content: `New group created: ${group.name} - ${group.description}`,
          authorId: 'system',
        })
      }
    }

    this.emit('group_created', group.toJSON())
    return group
  }

  getGroup(groupId) {
    return this.groups.get(groupId) || null
  }

  listGroups(options = {}) {
    let groups = Array.from(this.groups.values())

    // Filter visible groups
    groups = groups.filter((g) => {
      if (g.visibility === GROUP_VISIBILITY.public) return true
      if (g.isMember(this.nodeId)) return true
      return false
    })

    return groups.map((g) => g.toJSON())
  }

  joinGroup(groupId) {
    const group = this.groups.get(groupId)
    if (!group) throw new Error('Group not found')

    if (group.visibility === GROUP_VISIBILITY.private) {
      throw new Error('Cannot join private group without invitation')
    }

    group.addMember(this.nodeId)
    this._saveGroup(group)
    this.emit('joined_group', { groupId, userId: this.nodeId })
    return true
  }

  createPost(groupId, postData) {
    const group = this.groups.get(groupId)
    if (!group) throw new Error('Group not found')

    if (!group.isMember(postData.authorId || this.nodeId) && postData.authorId !== 'system') {
      throw new Error('Must be a member to post')
    }

    // Check limits (basic implementation)
    if (postData.content && postData.content.length > 5000) {
      throw new Error('Post content too long')
    }

    const post = new GroupPost({
      ...postData,
      groupId,
      authorId: postData.authorId || this.nodeId,
    })

    group.addPost(post)
    this._saveGroup(group)
    this.emit('post_created', post.toJSON())
    return post
  }

  addReaction(groupId, postId, reaction) {
    const group = this.groups.get(groupId)
    if (!group) throw new Error('Group not found')

    const post = group.posts.find((p) => p.id === postId)
    if (!post) throw new Error('Post not found')

    if (!group.isMember(this.nodeId)) throw new Error('Must be a member to react')

    post.addReaction(this.nodeId, reaction)
    this._saveGroup(group)
    return true
  }

  addComment(groupId, postId, content) {
    const group = this.groups.get(groupId)
    if (!group) throw new Error('Group not found')

    const post = group.posts.find((p) => p.id === postId)
    if (!post) throw new Error('Post not found')

    if (!group.isMember(this.nodeId)) throw new Error('Must be a member to comment')

    const comment = new GroupComment({
      authorId: this.nodeId,
      content,
    })

    post.addComment(comment)
    this._saveGroup(group)
    return comment
  }
}

let defaultManager = null
function getGroupsManager(options = {}) {
  if (!defaultManager && options.nodeId) {
    defaultManager = new GroupsManager(options)
  }
  return defaultManager
}

module.exports = {
  GroupsManager,
  Group,
  GroupPost,
  getGroupsManager,
  GROUP_VISIBILITY,
}
