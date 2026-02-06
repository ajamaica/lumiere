#!/usr/bin/env node
/**
 * Main Scheduler - Add posts to queue or run daemon
 */

const QueueManager = require('./queue')
const { postThread } = require('./thread')
const { logPost } = require('./analytics')

// Load all platform modules
const platforms = {
  discord: require('./platforms/discord'),
  reddit: require('./platforms/reddit'),
  twitter: require('./platforms/twitter'),
  mastodon: require('./platforms/mastodon'),
  bluesky: require('./platforms/bluesky'),
  moltbook: require('./platforms/moltbook'),
}

const queue = new QueueManager()

/**
 * Schedule a post for future delivery
 */
async function schedulePost(platformName, config, content, scheduledTime) {
  // Validate scheduled time
  const schedTime = new Date(scheduledTime)
  if (isNaN(schedTime.getTime())) {
    throw new Error('Invalid scheduled time. Use ISO format: 2026-02-02T20:00:00')
  }

  if (schedTime <= new Date()) {
    throw new Error('Scheduled time must be in the future')
  }

  // Normalize platform name
  platformName = platformName.toLowerCase()

  // Validate platform exists
  const platform = platforms[platformName]
  if (!platform) {
    throw new Error(
      `Platform '${platformName}' not supported.\nAvailable: ${Object.keys(platforms).join(', ')}`,
    )
  }

  // Parse config if it's a string
  let parsedConfig = config
  if (typeof config === 'string') {
    try {
      parsedConfig = JSON.parse(config)
    } catch (error) {
      // If not JSON, assume it's a simple string config (like webhook URL)
      parsedConfig = config
    }
  }

  // Validate config
  try {
    platform.validate(parsedConfig)
  } catch (error) {
    throw new Error(`Invalid ${platformName} config: ${error.message}`)
  }

  // Detect if this is a thread (array of content)
  const isThread = Array.isArray(content)

  // Validate content
  if (isThread) {
    // Validate each item in thread
    content.forEach((item, i) => {
      try {
        platform.validateContent(item)
      } catch (error) {
        throw new Error(`Thread item ${i + 1} invalid: ${error.message}`)
      }
    })
  } else {
    platform.validateContent(content)
  }

  // Create post object
  const post = {
    platform: platformName,
    content,
    isThread,
    scheduledTime: schedTime.toISOString(),
    config: parsedConfig,
  }

  // Add to queue
  const queuedPost = queue.add(post)

  console.log('✅ Post scheduled!')
  console.log(`ID: ${queuedPost.id}`)
  console.log(`Platform: ${queuedPost.platform}`)
  console.log(`Type: ${isThread ? `Thread (${content.length} posts)` : 'Single post'}`)
  console.log(`Scheduled: ${queuedPost.scheduledTime}`)

  if (isThread) {
    console.log(`Content: ${content[0].substring(0, 50)}... (+ ${content.length - 1} more)`)
  } else {
    const preview =
      typeof content === 'string'
        ? content
        : content.text || content.status || JSON.stringify(content)
    console.log(`Content: ${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}`)
  }

  return queuedPost
}

/**
 * Process ready posts from queue
 */
async function processQueue() {
  const ready = queue.getReady()

  if (ready.length === 0) {
    return 0
  }

  console.log(`📤 Processing ${ready.length} ready post(s)...`)

  let sent = 0

  for (const post of ready) {
    try {
      const platform = platforms[post.platform]
      if (!platform) {
        throw new Error(`Platform '${post.platform}' not implemented`)
      }

      let result

      // Check if this is a thread
      if (post.isThread) {
        console.log(
          `  📝 Posting ${post.content.length}-tweet thread to ${post.platform}: ${post.id}`,
        )
        result = await postThread(post.platform, post.config, post.content)
      } else {
        console.log(`  📤 Posting to ${post.platform}: ${post.id}`)
        result = await platform.post(post.config, post.content)
      }

      queue.markSent(post.id, result)
      sent++
      console.log(`  ✅ Sent successfully`)

      // Log analytics
      await logPost({
        id: post.id,
        platform: post.platform,
        scheduledTime: post.scheduledTime,
        success: true,
        media: post.content.media || post.content.attachments,
        thread: post.isThread ? post.content : undefined,
      })
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`)
      queue.markFailed(post.id, error)

      // Log analytics for failure
      await logPost({
        id: post.id,
        platform: post.platform,
        scheduledTime: post.scheduledTime,
        success: false,
        error: error.message,
        media: post.content.media || post.content.attachments,
        thread: post.isThread ? post.content : undefined,
      })
    }
  }

  return sent
}

/**
 * Run scheduler daemon (checks every minute)
 */
async function daemon() {
  console.log('🤖 Scheduler daemon started')
  console.log('Checking queue every 60 seconds...')
  console.log('Press Ctrl+C to stop')
  console.log('')

  // Check immediately
  await processQueue()

  // Then check every minute
  setInterval(async () => {
    await processQueue()
  }, 60 * 1000)
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  try {
    if (!command || command === 'daemon') {
      // Run daemon
      await daemon()
    } else if (command === 'add') {
      // Schedule a post
      const [, platform, config, content, scheduledTime] = args

      if (!platform || !config || !content || !scheduledTime) {
        console.log('Usage: node schedule.js add <platform> <config> <content> <time>')
        console.log('')
        console.log('Example:')
        console.log('  node schedule.js add discord WEBHOOK_URL "Hello!" "2026-02-02T20:00:00"')
        console.log('')
        process.exit(1)
      }

      await schedulePost(platform, config, content, scheduledTime)
    } else if (command === 'list') {
      // List queue
      const posts = queue.list()
      console.log(`📋 Queue (${posts.length} total posts):`)
      console.log('')

      const pending = posts.filter((p) => p.status === 'pending')
      const sent = posts.filter((p) => p.status === 'sent')
      const failed = posts.filter((p) => p.status === 'failed')

      console.log(`⏳ Pending: ${pending.length}`)
      pending.forEach((p) => {
        console.log(`  ${p.id}: ${p.platform} @ ${p.scheduledTime}`)
      })

      console.log(`\n✅ Sent: ${sent.length}`)
      console.log(`❌ Failed: ${failed.length}`)
    } else if (command === 'cancel') {
      // Cancel a post
      const [, postId] = args

      if (!postId) {
        console.log('Usage: node schedule.js cancel <post_id>')
        process.exit(1)
      }

      const canceled = queue.cancel(postId)
      if (canceled) {
        console.log(`✅ Canceled: ${canceled.id}`)
      } else {
        console.log(`❌ Post not found: ${postId}`)
        process.exit(1)
      }
    } else if (command === 'cleanup') {
      // Clean up old posts
      const removed = queue.cleanup()
      console.log(`🧹 Cleaned up ${removed} old post(s)`)
    } else {
      console.log('Unknown command:', command)
      console.log('')
      console.log('Commands:')
      console.log('  daemon          - Run scheduler (default)')
      console.log('  add             - Schedule a post')
      console.log('  list            - List queue')
      console.log('  cancel <id>     - Cancel scheduled post')
      console.log('  cleanup         - Remove old sent/failed posts')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { schedulePost, processQueue }
