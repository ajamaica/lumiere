/**
 * Mastodon Platform Implementation
 * Supports posting to any Mastodon instance
 * Uses mastodon-api library
 */

const Mastodon = require('mastodon-api')

/**
 * Validate Mastodon configuration
 * @param {object} config - Must contain instance URL and access token
 * @returns {boolean}
 */
function validate(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Mastodon config must be an object')
  }

  if (!config.instance) {
    throw new Error('Mastodon config missing "instance" (e.g., "mastodon.social")')
  }

  if (!config.accessToken) {
    throw new Error(
      'Mastodon config missing "accessToken"\n\n' +
        'To get an access token:\n' +
        '1. Log in to your Mastodon instance\n' +
        '2. Go to Preferences → Development → New Application\n' +
        '3. Give it a name, set scopes (at least "write:statuses")\n' +
        '4. Copy the access token\n\n' +
        'Format:\n' +
        '{\n' +
        '  "instance": "mastodon.social",\n' +
        '  "accessToken": "YOUR_ACCESS_TOKEN"\n' +
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
    if (content.length > 500) {
      throw new Error(
        `Post too long: ${content.length} characters (Mastodon limit is typically 500, but varies by instance)`,
      )
    }
    return true
  }

  // Structured post object
  if (typeof content !== 'object') {
    throw new Error('Post content must be a string or object')
  }

  if (!content.status) {
    throw new Error('Post object must have a "status" field (the text)')
  }

  if (typeof content.status !== 'string') {
    throw new Error('Post status must be a string')
  }

  if (content.status.length === 0) {
    throw new Error('Post status cannot be empty')
  }

  return true
}

/**
 * Post to Mastodon
 * @param {object} config - Instance URL and access token
 * @param {object|string} content - Post text or structured content
 * @returns {Promise<object>} - Posted status data
 */
async function post(config, content) {
  // Validate inputs
  validate(config)
  validateContent(content)

  // Ensure instance URL doesn't have protocol
  let instance = config.instance.replace(/^https?:\/\//, '')

  // Create Mastodon client
  const M = new Mastodon({
    access_token: config.accessToken,
    api_url: `https://${instance}/api/v1/`,
  })

  try {
    // Build post parameters
    let params

    if (typeof content === 'string') {
      // Simple text post
      params = { status: content }
    } else {
      // Structured post
      params = {
        status: content.status,
        visibility: content.visibility || 'public', // public, unlisted, private, direct
        sensitive: content.sensitive || false,
        spoiler_text: content.spoiler_text || undefined,
        in_reply_to_id: content.in_reply_to_id || undefined,
        media_ids: content.media_ids || undefined,
        poll: content.poll || undefined,
      }
    }

    // Post the status
    const response = await new Promise((resolve, reject) => {
      M.post('statuses', params, (error, data) => {
        if (error) reject(error)
        else resolve(data)
      })
    })

    return {
      success: true,
      platform: 'mastodon',
      instance: instance,
      id: response.id,
      text: response.content,
      url: response.url,
      raw: response,
    }
  } catch (error) {
    // Handle Mastodon API errors
    if (error.statusCode === 401) {
      throw new Error('Mastodon API error: Unauthorized. Check your access token.')
    }
    if (error.statusCode === 422) {
      throw new Error(`Mastodon API error: ${error.message || 'Unprocessable content'}`)
    }
    if (error.statusCode === 429) {
      throw new Error('Mastodon API error: Rate limit exceeded. Try again later.')
    }
    throw new Error(`Mastodon API error: ${error.message || error}`)
  }
}

module.exports = {
  name: 'mastodon',
  displayName: 'Mastodon',
  validate,
  validateContent,
  post,

  help: {
    configFormat: {
      instance: 'Your Mastodon instance (e.g., "mastodon.social")',
      accessToken: 'Your access token from Developer settings',
    },
    getCredentials: 'In your Mastodon: Preferences → Development → New Application',
    examples: {
      simple: 'Just a string: "Hello Fediverse!"',
      structured: '{ "status": "Post text", "visibility": "public" }',
      reply: '{ "status": "Reply", "in_reply_to_id": "123456" }',
      withCW:
        '{ "status": "Sensitive content", "spoiler_text": "Content warning", "sensitive": true }',
    },
  },
}
