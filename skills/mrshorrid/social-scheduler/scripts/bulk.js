#!/usr/bin/env node

/**
 * Bulk Scheduler - Schedule multiple posts from CSV or JSON
 *
 * Usage:
 *   node scripts/bulk.js import <file.csv|file.json>
 *   node scripts/bulk.js template > calendar.csv
 *
 * CSV Format:
 *   datetime,platform,content,media
 *   2026-02-04 10:00,twitter,Hello world!,
 *   2026-02-04 15:30,reddit,Check this out,/path/to/image.jpg
 *
 * JSON Format:
 *   [
 *     {
 *       "datetime": "2026-02-04T10:00:00",
 *       "platform": "twitter",
 *       "content": "Hello world!",
 *       "media": null
 *     }
 *   ]
 */

const fs = require('fs').promises
const path = require('path')
const { Queue } = require('./queue.js')

// Platform imports
const discord = require('./platforms/discord.js')
const reddit = require('./platforms/reddit.js')
const twitter = require('./platforms/twitter.js')
const mastodon = require('./platforms/mastodon.js')
const bluesky = require('./platforms/bluesky.js')
const moltbook = require('./platforms/moltbook.js')
const linkedin = require('./platforms/linkedin.js')

const PLATFORMS = {
  discord,
  reddit,
  twitter,
  mastodon,
  bluesky,
  moltbook,
  linkedin,
}

const queue = new Queue()

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current.trim())
  return fields
}

// Parse CSV file
async function parseCSV(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.split('\n').filter((l) => l.trim())

  if (lines.length < 2) {
    throw new Error('CSV must have header row and at least one data row')
  }

  const header = parseCSVLine(lines[0])
  const posts = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    const post = {}

    header.forEach((key, idx) => {
      post[key.toLowerCase()] = fields[idx] || ''
    })

    // Remove empty quotes
    Object.keys(post).forEach((key) => {
      if (post[key] === '""' || post[key] === "''") {
        post[key] = ''
      }
    })

    posts.push(post)
  }

  return posts
}

// Parse JSON file
async function parseJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return JSON.parse(content)
}

// Load platform config from environment or file
async function loadPlatformConfig(platform) {
  // Try environment variables first
  const envPrefix = platform.toUpperCase()

  // Platform-specific env loading
  if (platform === 'discord') {
    const webhook = process.env.DISCORD_WEBHOOK_URL
    if (webhook) return { webhook }
  }

  if (platform === 'reddit') {
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    const refreshToken = process.env.REDDIT_REFRESH_TOKEN
    if (clientId && clientSecret && refreshToken) {
      return { clientId, clientSecret, refreshToken }
    }
  }

  if (platform === 'twitter') {
    const apiKey = process.env.TWITTER_API_KEY
    const apiSecret = process.env.TWITTER_API_SECRET
    const accessToken = process.env.TWITTER_ACCESS_TOKEN
    const accessSecret = process.env.TWITTER_ACCESS_SECRET
    if (apiKey && apiSecret && accessToken && accessSecret) {
      return { apiKey, apiSecret, accessToken, accessSecret }
    }
  }

  if (platform === 'mastodon') {
    const instance = process.env.MASTODON_INSTANCE
    const accessToken = process.env.MASTODON_ACCESS_TOKEN
    if (instance && accessToken) {
      return { instance, accessToken }
    }
  }

  if (platform === 'bluesky') {
    const handle = process.env.BLUESKY_HANDLE
    const password = process.env.BLUESKY_PASSWORD
    if (handle && password) {
      return { handle, password }
    }
  }

  if (platform === 'moltbook') {
    const apiKey = process.env.MOLTBOOK_API_KEY
    if (apiKey) return { apiKey }
  }

  if (platform === 'linkedin') {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
    if (accessToken) return { accessToken }
  }

  // Try loading from config file
  const configPath = path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.openclaw',
    'social-config.json',
  )
  try {
    const configContent = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(configContent)
    if (config[platform]) {
      return config[platform]
    }
  } catch (err) {
    // Config file doesn't exist or platform not configured
  }

  return null
}

// Validate and schedule a single post
async function schedulePost(post, dryRun = false) {
  const { datetime, platform, content, media, config } = post

  // Validate required fields
  if (!datetime) {
    return { success: false, error: 'Missing datetime' }
  }

  if (!platform) {
    return { success: false, error: 'Missing platform' }
  }

  if (!content) {
    return { success: false, error: 'Missing content' }
  }

  // Parse datetime
  const scheduledTime = new Date(datetime)
  if (isNaN(scheduledTime.getTime())) {
    return { success: false, error: `Invalid datetime: ${datetime}` }
  }

  // Check if in past
  if (scheduledTime < new Date()) {
    return { success: false, error: `Datetime is in the past: ${datetime}` }
  }

  // Validate platform exists
  const platformModule = PLATFORMS[platform.toLowerCase()]
  if (!platformModule) {
    return {
      success: false,
      error: `Unknown platform: ${platform}. Supported: ${Object.keys(PLATFORMS).join(', ')}`,
    }
  }

  // Load or parse config
  let platformConfig = config
  if (!platformConfig) {
    platformConfig = await loadPlatformConfig(platform.toLowerCase())
  } else if (typeof platformConfig === 'string') {
    try {
      platformConfig = JSON.parse(platformConfig)
    } catch (err) {
      return { success: false, error: `Invalid config JSON: ${err.message}` }
    }
  }

  if (!platformConfig) {
    return {
      success: false,
      error: `No config found for ${platform}. Set environment variables or add to ~/.openclaw/social-config.json`,
    }
  }

  // Validate platform config
  try {
    await platformModule.validate(platformConfig)
  } catch (err) {
    return { success: false, error: `Config validation failed: ${err.message}` }
  }

  // Validate content
  if (platformModule.validateContent) {
    try {
      await platformModule.validateContent(content)
    } catch (err) {
      return { success: false, error: `Content validation failed: ${err.message}` }
    }
  }

  // Check media file exists if provided
  if (media && media.trim()) {
    try {
      await fs.access(media.trim())
    } catch (err) {
      return { success: false, error: `Media file not found: ${media}` }
    }
  }

  // Add to queue (unless dry run)
  if (!dryRun) {
    await queue.add(
      platform.toLowerCase(),
      platformConfig,
      content,
      scheduledTime,
      media && media.trim() ? media.trim() : null,
    )
  }

  return {
    success: true,
    platform: platform.toLowerCase(),
    scheduledTime: scheduledTime.toISOString(),
    content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
  }
}

// Import bulk posts
async function importBulk(filePath, dryRun = false) {
  console.log(`📥 Importing posts from: ${filePath}`)
  console.log(dryRun ? '🔍 DRY RUN - No posts will be scheduled\n' : '')

  // Parse file based on extension
  let posts
  if (filePath.endsWith('.csv')) {
    posts = await parseCSV(filePath)
  } else if (filePath.endsWith('.json')) {
    posts = await parseJSON(filePath)
  } else {
    throw new Error('File must be .csv or .json')
  }

  console.log(`Found ${posts.length} posts to schedule\n`)

  // Schedule each post
  const results = {
    success: [],
    failed: [],
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const num = i + 1

    process.stdout.write(`[${num}/${posts.length}] Scheduling... `)

    const result = await schedulePost(post, dryRun)

    if (result.success) {
      console.log(`✅ ${result.platform} at ${result.scheduledTime}`)
      results.success.push(result)
    } else {
      console.log(`❌ ${result.error}`)
      results.failed.push({ post, error: result.error })
    }
  }

  // Summary
  console.log(`\n📊 Results:`)
  console.log(`  ✅ Successfully scheduled: ${results.success.length}`)
  console.log(`  ❌ Failed: ${results.failed.length}`)

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Posts:')
    results.failed.forEach((f, idx) => {
      console.log(`  ${idx + 1}. ${f.error}`)
      console.log(`     ${JSON.stringify(f.post)}`)
    })
  }

  if (!dryRun && results.success.length > 0) {
    console.log('\n✨ Posts scheduled! Run "node scripts/schedule.js list" to view queue.')
  }
}

// Generate CSV template
function generateTemplate() {
  const template = `datetime,platform,content,media,config
2026-02-04T10:00:00,twitter,"Hello from bulk scheduler!",,"optional JSON config"
2026-02-04T15:30:00,reddit,"Check out this cool post",/path/to/image.jpg,
2026-02-05T09:00:00,discord,"Good morning everyone!",,
2026-02-05T18:00:00,mastodon,"Evening thoughts...",path/to/video.mp4,`

  console.log(template)
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === 'import') {
    const filePath = args[1]
    const dryRun = args.includes('--dry-run') || args.includes('-d')

    if (!filePath) {
      console.error('❌ Usage: node scripts/bulk.js import <file.csv|file.json> [--dry-run]')
      process.exit(1)
    }

    try {
      await importBulk(filePath, dryRun)
    } catch (err) {
      console.error(`❌ Error: ${err.message}`)
      process.exit(1)
    }
  } else if (command === 'template') {
    generateTemplate()
  } else {
    console.log(`
📦 Bulk Scheduler - Schedule multiple posts at once

Usage:
  node scripts/bulk.js import <file.csv|file.json> [--dry-run]
  node scripts/bulk.js template

Commands:
  import <file>    Import and schedule posts from CSV or JSON file
  template         Print CSV template to stdout

Options:
  --dry-run, -d    Validate without scheduling (test mode)

CSV Format:
  datetime,platform,content,media,config
  2026-02-04T10:00:00,twitter,"Hello world!",,"optional JSON"
  2026-02-04T15:30:00,reddit,"Post text",/path/to/image.jpg,

JSON Format:
  [
    {
      "datetime": "2026-02-04T10:00:00",
      "platform": "twitter",
      "content": "Hello world!",
      "media": null,
      "config": null
    }
  ]

Config Priority:
  1. config column in file (JSON string)
  2. Environment variables (TWITTER_API_KEY, etc.)
  3. ~/.openclaw/social-config.json

Supported Platforms:
  discord, reddit, twitter, mastodon, bluesky, moltbook, linkedin

Examples:
  # Generate template
  node scripts/bulk.js template > mycalendar.csv
  
  # Test without scheduling
  node scripts/bulk.js import mycalendar.csv --dry-run
  
  # Schedule for real
  node scripts/bulk.js import mycalendar.csv
`)
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { parseCSV, parseJSON, schedulePost, importBulk }
