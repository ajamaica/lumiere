#!/usr/bin/env node
/**
 * Queue Manager - Handles scheduled post storage and retrieval
 */

const fs = require('fs')
const path = require('path')

const QUEUE_FILE = path.join(__dirname, '../storage/queue.json')

class QueueManager {
  constructor() {
    this.ensureQueueFile()
  }

  /**
   * Ensure queue.json exists
   */
  ensureQueueFile() {
    const dir = path.dirname(QUEUE_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(QUEUE_FILE)) {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify({ posts: [] }, null, 2))
    }
  }

  /**
   * Load queue from disk
   */
  load() {
    const data = fs.readFileSync(QUEUE_FILE, 'utf8')
    return JSON.parse(data)
  }

  /**
   * Save queue to disk
   */
  save(queue) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2))
  }

  /**
   * Add a post to the queue
   * @param {Object} post - Post object
   * @param {string} post.platform - Platform name (discord, twitter, etc.)
   * @param {Object} post.content - Platform-specific content
   * @param {string} post.scheduledTime - ISO timestamp
   * @param {Object} post.config - Platform configuration (webhooks, tokens, etc.)
   */
  add(post) {
    const queue = this.load()

    const queuedPost = {
      id: this.generateId(),
      platform: post.platform,
      content: post.content,
      scheduledTime: post.scheduledTime,
      config: post.config,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
    }

    queue.posts.push(queuedPost)
    this.save(queue)

    return queuedPost
  }

  /**
   * Get all pending posts
   */
  getPending() {
    const queue = this.load()
    return queue.posts.filter((p) => p.status === 'pending')
  }

  /**
   * Get posts ready to send (scheduled time has passed)
   */
  getReady() {
    const queue = this.load()
    const now = new Date()

    return queue.posts.filter((p) => p.status === 'pending' && new Date(p.scheduledTime) <= now)
  }

  /**
   * Mark post as sent
   */
  markSent(id, result) {
    const queue = this.load()
    const post = queue.posts.find((p) => p.id === id)

    if (post) {
      post.status = 'sent'
      post.sentAt = new Date().toISOString()
      post.result = result
      this.save(queue)
    }
  }

  /**
   * Mark post as failed
   */
  markFailed(id, error) {
    const queue = this.load()
    const post = queue.posts.find((p) => p.id === id)

    if (post) {
      post.attempts += 1

      // After 3 attempts, mark as failed permanently
      if (post.attempts >= 3) {
        post.status = 'failed'
        post.failedAt = new Date().toISOString()
      }

      post.lastError = error.message || String(error)
      this.save(queue)
    }
  }

  /**
   * Cancel a scheduled post
   */
  cancel(id) {
    const queue = this.load()
    const index = queue.posts.findIndex((p) => p.id === id)

    if (index !== -1) {
      const post = queue.posts[index]
      queue.posts.splice(index, 1)
      this.save(queue)
      return post
    }

    return null
  }

  /**
   * List all posts (with optional status filter)
   */
  list(status = null) {
    const queue = this.load()

    if (status) {
      return queue.posts.filter((p) => p.status === status)
    }

    return queue.posts
  }

  /**
   * Clean up old sent/failed posts (older than 7 days)
   */
  cleanup() {
    const queue = this.load()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const before = queue.posts.length
    queue.posts = queue.posts.filter((p) => {
      if (p.status === 'pending') return true

      const completedTime = new Date(p.sentAt || p.failedAt)
      return completedTime >= sevenDaysAgo
    })

    this.save(queue)

    return before - queue.posts.length
  }

  /**
   * Generate unique ID for posts
   */
  generateId() {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = QueueManager
