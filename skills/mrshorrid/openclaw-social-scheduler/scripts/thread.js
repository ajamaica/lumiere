#!/usr/bin/env node
/**
 * Social Scheduler - Thread Posting
 * Post threaded content to supported platforms (Twitter, Mastodon, Bluesky)
 *
 * Usage:
 *   node scripts/thread.js <platform> <config> <tweets...>
 *   node scripts/thread.js twitter config.json "First tweet" "Second tweet" "Third tweet"
 */

const fs = require('fs')
const path = require('path')

// Platform modules
const platforms = {
  twitter: require('./platforms/twitter'),
  mastodon: require('./platforms/mastodon'),
  bluesky: require('./platforms/bluesky'),
}

/**
 * Post a thread (series of connected posts)
 * @param {string} platformName - Platform to post to
 * @param {object} config - Platform configuration
 * @param {string[]} tweets - Array of tweet texts
 * @returns {Promise<object[]>} - Array of posted tweet data
 */
async function postThread(platformName, config, tweets) {
  if (!platforms[platformName]) {
    throw new Error(
      `Thread posting not supported for platform: ${platformName}\nSupported: twitter, mastodon, bluesky`,
    )
  }

  if (!Array.isArray(tweets) || tweets.length === 0) {
    throw new Error('Thread must contain at least one tweet')
  }

  if (tweets.length === 1) {
    console.log('⚠️  Only one tweet provided - posting as single tweet, not a thread')
  }

  const platform = platforms[platformName]
  const results = []
  let previousId = null

  console.log(`📝 Posting ${tweets.length}-tweet thread to ${platform.displayName}...`)

  for (let i = 0; i < tweets.length; i++) {
    const tweetNum = i + 1
    const text = tweets[i]

    console.log(
      `\n[${tweetNum}/${tweets.length}] Posting: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
    )

    try {
      let content

      if (platformName === 'twitter') {
        // Twitter: Use reply_to for threading
        content = previousId ? { text, reply_to: previousId } : text
      } else if (platformName === 'mastodon') {
        // Mastodon: Use in_reply_to_id for threading
        content = previousId ? { status: text, in_reply_to_id: previousId } : { status: text }
      } else if (platformName === 'bluesky') {
        // Bluesky: Use reply for threading
        content = previousId
          ? { text, reply: { parent: previousId.uri, root: results[0].uri } }
          : { text }
      }

      const result = await platform.post(config, content)
      results.push(result)

      // Store ID for next tweet to reply to
      if (platformName === 'twitter') {
        previousId = result.id
      } else if (platformName === 'mastodon') {
        previousId = result.id
      } else if (platformName === 'bluesky') {
        previousId = { uri: result.uri, cid: result.cid }
      }

      console.log(`✅ Posted successfully!`)
      console.log(`   URL: ${result.url || result.uri || 'N/A'}`)

      // Rate limiting: Wait 1 second between posts
      if (i < tweets.length - 1) {
        console.log('   ⏳ Waiting 1 second before next tweet...')
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    } catch (error) {
      console.error(`❌ Failed to post tweet ${tweetNum}:`, error.message)
      throw new Error(`Thread failed at tweet ${tweetNum}: ${error.message}`)
    }
  }

  console.log(`\n🎉 Thread complete! Posted ${results.length} tweets.`)
  console.log(`\n📊 Thread Summary:`)
  results.forEach((result, i) => {
    console.log(`   ${i + 1}. ${result.url || result.uri || `ID: ${result.id}`}`)
  })

  return results
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log('Social Scheduler - Thread Posting')
    console.log('')
    console.log('Usage:')
    console.log('  node scripts/thread.js <platform> <config> <tweet1> <tweet2> [tweet3...]')
    console.log('')
    console.log('Platforms:')
    console.log('  twitter   - Post Twitter/X thread (OAuth 1.0a)')
    console.log('  mastodon  - Post Mastodon thread (access token)')
    console.log('  bluesky   - Post Bluesky thread (app password)')
    console.log('')
    console.log('Examples:')
    console.log(
      '  node scripts/thread.js twitter config.json "First tweet" "Second tweet" "Third tweet"',
    )
    console.log(
      '  node scripts/thread.js mastodon config.json "Thread 1/3" "Thread 2/3" "Thread 3/3"',
    )
    console.log(
      '  node scripts/thread.js bluesky config.json "Story part 1" "Story part 2" "The end!"',
    )
    console.log('')
    process.exit(1)
  }

  const [platformName, configPath, ...tweets] = args

  try {
    // Load and parse config
    let config
    try {
      if (configPath.startsWith('{')) {
        // Config provided as JSON string
        config = JSON.parse(configPath)
      } else {
        // Config provided as file path
        const configFile = path.resolve(configPath)
        const configData = fs.readFileSync(configFile, 'utf8')
        config = JSON.parse(configData)
      }
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`)
    }

    // Post the thread
    await postThread(platformName, config, tweets)
  } catch (error) {
    console.error('\n❌ Thread posting failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { postThread }
