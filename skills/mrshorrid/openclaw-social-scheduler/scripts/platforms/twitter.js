/**
 * Twitter/X Platform - OAuth 1.0a Implementation
 * Supports posting tweets with media and threads
 * Built with twitter-api-v2 library
 */

const { TwitterApi } = require('twitter-api-v2')

/**
 * Validate Twitter configuration
 * @param {object} config - Must contain OAuth 1.0a credentials
 * @returns {boolean}
 */
function validate(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Twitter config must be an object with OAuth credentials')
  }

  const required = ['appKey', 'appSecret', 'accessToken', 'accessSecret']
  const missing = required.filter((key) => !config[key])

  if (missing.length > 0) {
    throw new Error(
      `Twitter config missing required fields: ${missing.join(', ')}\n\n` +
        'Required format:\n' +
        '{\n' +
        '  "appKey": "YOUR_CONSUMER_KEY",\n' +
        '  "appSecret": "YOUR_CONSUMER_SECRET",\n' +
        '  "accessToken": "YOUR_ACCESS_TOKEN",\n' +
        '  "accessSecret": "YOUR_ACCESS_SECRET"\n' +
        '}\n\n' +
        'Get these from: https://developer.twitter.com/en/portal/dashboard',
    )
  }

  return true
}

/**
 * Validate tweet content before posting
 * @param {object|string} content - Tweet text or structured content
 * @returns {boolean}
 */
function validateContent(content) {
  // Simple text tweet
  if (typeof content === 'string') {
    if (content.length === 0) {
      throw new Error('Tweet text cannot be empty')
    }
    if (content.length > 280) {
      throw new Error(`Tweet too long: ${content.length} characters (max 280)`)
    }
    return true
  }

  // Structured tweet object
  if (typeof content !== 'object') {
    throw new Error('Tweet content must be a string or object')
  }

  // For structured content, validate text field
  if (content.text) {
    if (typeof content.text !== 'string') {
      throw new Error('Tweet text must be a string')
    }
    if (content.text.length === 0) {
      throw new Error('Tweet text cannot be empty')
    }
    if (content.text.length > 280) {
      throw new Error(`Tweet too long: ${content.text.length} characters (max 280)`)
    }
  } else {
    throw new Error('Tweet object must have a "text" field')
  }

  // Validate reply_to if present
  if (content.reply_to && typeof content.reply_to !== 'string') {
    throw new Error('reply_to must be a tweet ID string')
  }

  // Validate quote_tweet if present
  if (content.quote_tweet && typeof content.quote_tweet !== 'string') {
    throw new Error('quote_tweet must be a tweet ID string')
  }

  return true
}

/**
 * Post to Twitter/X
 * @param {object} config - OAuth 1.0a credentials
 * @param {object|string} content - Tweet text or structured content
 * @returns {Promise<object>} - Posted tweet data
 */
async function post(config, content) {
  // Validate inputs
  validate(config)
  validateContent(content)

  // Create authenticated client
  const client = new TwitterApi({
    appKey: config.appKey,
    appSecret: config.appSecret,
    accessToken: config.accessToken,
    accessSecret: config.accessSecret,
  })

  // Get read-write client (needed for posting)
  const rwClient = client.readWrite

  try {
    // Handle simple string tweets
    if (typeof content === 'string') {
      const tweet = await rwClient.v2.tweet(content)
      return {
        success: true,
        platform: 'twitter',
        id: tweet.data.id,
        text: tweet.data.text,
        url: `https://twitter.com/i/web/status/${tweet.data.id}`,
        raw: tweet.data,
      }
    }

    // Handle structured tweet objects
    const tweetData = { text: content.text }

    // Add reply if specified
    if (content.reply_to) {
      tweetData.reply = {
        in_reply_to_tweet_id: content.reply_to,
      }
    }

    // Add quote tweet if specified
    if (content.quote_tweet) {
      tweetData.quote_tweet_id = content.quote_tweet
    }

    // Add media if specified (media IDs must be uploaded first)
    if (content.media_ids && Array.isArray(content.media_ids)) {
      tweetData.media = {
        media_ids: content.media_ids,
      }
    }

    // Post the tweet
    const tweet = await rwClient.v2.tweet(tweetData)

    return {
      success: true,
      platform: 'twitter',
      id: tweet.data.id,
      text: tweet.data.text,
      url: `https://twitter.com/i/web/status/${tweet.data.id}`,
      raw: tweet.data,
    }
  } catch (error) {
    // Handle Twitter API errors
    if (error.code === 403) {
      throw new Error('Twitter API error: Forbidden. Check your app permissions.')
    }
    if (error.code === 401) {
      throw new Error('Twitter API error: Unauthorized. Check your credentials.')
    }
    if (error.code === 429) {
      throw new Error('Twitter API error: Rate limit exceeded. Try again later.')
    }
    if (error.data) {
      const details = error.data.errors?.[0]?.message || error.data.detail || 'Unknown error'
      throw new Error(`Twitter API error: ${details}`)
    }
    throw error
  }
}

module.exports = {
  name: 'twitter',
  displayName: 'Twitter/X',
  validate,
  validateContent,
  post,

  // Helper info for users
  help: {
    configFormat: {
      appKey: 'Consumer Key (API Key)',
      appSecret: 'Consumer Secret (API Secret)',
      accessToken: 'Access Token',
      accessSecret: 'Access Token Secret',
    },
    getCredentials: 'https://developer.twitter.com/en/portal/dashboard',
    examples: {
      simple: 'Just a string: "Hello, World!"',
      reply: '{ "text": "Reply text", "reply_to": "1234567890" }',
      quote: '{ "text": "Quote tweet", "quote_tweet": "1234567890" }',
      media: '{ "text": "With media", "media_ids": ["1234567890"] }',
    },
  },
}
