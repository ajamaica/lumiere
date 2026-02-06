#!/usr/bin/env node
/**
 * Immediate posting script - Post to social media NOW
 */

const fs = require('fs')
const discord = require('./platforms/discord')
const reddit = require('./platforms/reddit')
const twitter = require('./platforms/twitter')
const mastodon = require('./platforms/mastodon')
const bluesky = require('./platforms/bluesky')
const moltbook = require('./platforms/moltbook')

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log('Usage: node post.js <platform> <config> <content>')
    console.log('')
    console.log('Examples:')
    console.log('  Discord:')
    console.log('    node post.js discord WEBHOOK_URL "Hello from OpenClaw!"')
    console.log('  Moltbook:')
    console.log('    node post.js moltbook .credentials/moltbook.json "Hello world!"')
    console.log('  Reddit:')
    console.log('    node post.js reddit .credentials/reddit.json "My post text"')
    console.log('')
    process.exit(1)
  }

  const [platform, config, content] = args

  try {
    let result
    let credentials

    // Load credentials from file if it's a path
    if (config.endsWith('.json')) {
      credentials = JSON.parse(fs.readFileSync(config, 'utf8'))
    } else {
      credentials = config // Direct credential string (e.g., webhook URL)
    }

    switch (platform.toLowerCase()) {
      case 'discord':
        discord.validate(credentials)
        result = await discord.post(credentials, content)
        break

      case 'moltbook':
        moltbook.validate(credentials)
        result = await moltbook.post(credentials, content)
        break

      case 'reddit':
        reddit.validate(credentials)
        result = await reddit.post(credentials, { content, title: 'Post from OpenClaw' })
        break

      case 'twitter':
      case 'x':
        twitter.validate(credentials)
        result = await twitter.post(credentials, content)
        break

      case 'mastodon':
        mastodon.validate(credentials)
        result = await mastodon.post(credentials, content)
        break

      case 'bluesky':
        bluesky.validate(credentials)
        result = await bluesky.post(credentials, content)
        break

      default:
        throw new Error(`Platform '${platform}' not yet supported`)
    }

    console.log('✅ Posted successfully!')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Post failed:', error.message)
    process.exit(1)
  }
}

main()
