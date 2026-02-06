/**
 * Bluesky Platform Implementation
 * Uses AT Protocol (@atproto/api)
 */

const { BskyAgent } = require('@atproto/api')

/**
 * Validate Bluesky configuration
 * @param {object} config - Must contain identifier and password
 * @returns {boolean}
 */
function validate(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Bluesky config must be an object')
  }

  if (!config.identifier) {
    throw new Error('Bluesky config missing "identifier" (your handle or email)')
  }

  if (!config.password) {
    throw new Error(
      'Bluesky config missing "password" (your app password)\n\n' +
        'To create an app password:\n' +
        '1. Log in to Bluesky app\n' +
        '2. Go to Settings → Advanced → App passwords\n' +
        '3. Create a new app password\n\n' +
        'Format:\n' +
        '{\n' +
        '  "identifier": "yourhandle.bsky.social",\n' +
        '  "password": "your-app-password"\n' +
        '}',
    )
  }

  return true
}

/**
 * Validate post content
 * @param {object|string} content - Post text or structured content
 * @returns {boolean}
 */
function validateContent(content) {
  // Simple text post
  if (typeof content === 'string') {
    if (content.length === 0) {
      throw new Error('Post text cannot be empty')
    }
    if (content.length > 300) {
      throw new Error(`Post too long: ${content.length} characters (Bluesky limit is 300)`)
    }
    return true
  }

  // Structured post object
  if (typeof content !== 'object') {
    throw new Error('Post content must be a string or object')
  }

  if (!content.text) {
    throw new Error('Post object must have a "text" field')
  }

  if (typeof content.text !== 'string') {
    throw new Error('Post text must be a string')
  }

  if (content.text.length === 0) {
    throw new Error('Post text cannot be empty')
  }

  if (content.text.length > 300) {
    throw new Error(`Post too long: ${content.text.length} characters (Bluesky limit is 300)`)
  }

  return true
}

/**
 * Post to Bluesky
 * @param {object} config - Identifier and password (app password)
 * @param {object|string} content - Post text or structured content
 * @returns {Promise<object>} - Posted record data
 */
async function post(config, content) {
  // Validate inputs
  validate(config)
  validateContent(content)

  // Create agent
  const agent = new BskyAgent({
    service: config.service || 'https://bsky.social',
  })

  try {
    // Login
    await agent.login({
      identifier: config.identifier,
      password: config.password,
    })

    // Build post object
    let postData

    if (typeof content === 'string') {
      // Simple text post
      postData = { text: content }
    } else {
      // Structured post
      postData = {
        text: content.text,
        // Add reply if specified
        reply: content.reply
          ? {
              root: content.reply.root,
              parent: content.reply.parent,
            }
          : undefined,
        // Add embed (quote post, images, etc.) if specified
        embed: content.embed || undefined,
        // Add facets (mentions, links, hashtags) if specified
        facets: content.facets || undefined,
        // Add labels if specified
        labels: content.labels || undefined,
        // Add languages if specified
        langs: content.langs || undefined,
      }
    }

    // Create the post
    const response = await agent.post(postData)

    // Build post URL
    const handle = config.identifier.replace('@', '')
    const uri = response.uri
    // Extract record key (rkey) from AT URI: at://did:plc:xxx/app.bsky.feed.post/RKEY
    const rkey = uri.split('/').pop()
    const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`

    return {
      success: true,
      platform: 'bluesky',
      uri: response.uri,
      cid: response.cid,
      text: postData.text,
      url: postUrl,
      raw: response,
    }
  } catch (error) {
    // Handle Bluesky API errors
    if (error.status === 401) {
      throw new Error('Bluesky API error: Invalid credentials. Check identifier and app password.')
    }
    if (error.status === 400) {
      throw new Error(`Bluesky API error: ${error.message || 'Bad request'}`)
    }
    if (error.status === 429) {
      throw new Error('Bluesky API error: Rate limit exceeded. Try again later.')
    }
    throw new Error(`Bluesky API error: ${error.message || error}`)
  }
}

module.exports = {
  name: 'bluesky',
  displayName: 'Bluesky',
  validate,
  validateContent,
  post,

  help: {
    configFormat: {
      identifier: 'Your handle (e.g., "alice.bsky.social") or email',
      password: 'App password from Settings → Advanced → App passwords',
      service: '(Optional) Custom PDS URL (defaults to https://bsky.social)',
    },
    getCredentials: 'Bluesky app: Settings → Advanced → App passwords',
    examples: {
      simple: 'Just a string: "Hello ATmosphere!"',
      structured: '{ "text": "Post text", "langs": ["en"] }',
      reply: '{ "text": "Reply", "reply": { "root": {...}, "parent": {...} } }',
    },
  },
}
