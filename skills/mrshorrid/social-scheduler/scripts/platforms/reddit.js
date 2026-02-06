/**
 * Reddit Platform - OAuth2 Implementation
 * Supports posting and commenting via Reddit API
 */

const fetch = require('node-fetch')

// Token cache (persists across calls in same process)
const tokenCache = {
  token: null,
  expiry: null,
}

/**
 * Validate Reddit configuration
 * @param {object} config - OAuth2 credentials
 * @returns {boolean}
 */
function validate(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Reddit config must be an object with OAuth credentials')
  }

  const required = ['clientId', 'clientSecret', 'username', 'password']
  const missing = required.filter((key) => !config[key])

  if (missing.length > 0) {
    throw new Error(
      `Reddit config missing required fields: ${missing.join(', ')}\n\n` +
        'Required format:\n' +
        '{\n' +
        '  "clientId": "YOUR_CLIENT_ID",\n' +
        '  "clientSecret": "YOUR_CLIENT_SECRET",\n' +
        '  "username": "your_username",\n' +
        '  "password": "your_password",\n' +
        '  "userAgent": "YourApp/1.0" (optional)\n' +
        '}\n\n' +
        'Create a Reddit app at: https://www.reddit.com/prefs/apps',
    )
  }

  return true
}

/**
 * Validate post content
 * @param {object} content - Post or comment data
 * @returns {boolean}
 */
function validateContent(content) {
  if (!content || typeof content !== 'object') {
    throw new Error('Reddit content must be an object')
  }

  // Check if it's a comment
  if (content.thingId) {
    if (!content.text) {
      throw new Error('Comment must have "text" field')
    }
    if (typeof content.text !== 'string') {
      throw new Error('Comment text must be a string')
    }
    return true
  }

  // It's a post
  if (!content.subreddit) {
    throw new Error('Post must have "subreddit" field (without "r/")')
  }

  if (!content.title) {
    throw new Error('Post must have "title" field')
  }

  if (!content.text && !content.url) {
    throw new Error('Post must have either "text" (self post) or "url" (link post)')
  }

  if (content.text && content.url) {
    throw new Error('Post cannot have both "text" and "url" - choose one')
  }

  if (content.title.length > 300) {
    throw new Error(`Title too long: ${content.title.length} characters (max 300)`)
  }

  return true
}

/**
 * Get OAuth2 access token
 * @param {object} config - OAuth credentials
 * @returns {Promise<string>} - Access token
 */
async function getAccessToken(config) {
  // Return cached token if still valid
  if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
    return tokenCache.token
  }

  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const userAgent = config.userAgent || 'OpenClawBot/1.0'

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: `grant_type=password&username=${config.username}&password=${config.password}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Reddit OAuth failed (${response.status}): ${error}`)
  }

  const data = await response.json()
  tokenCache.token = data.access_token
  tokenCache.expiry = Date.now() + data.expires_in * 1000 - 60000 // Refresh 1 min early

  return tokenCache.token
}

/**
 * Post to Reddit (submit or comment)
 * @param {object} config - OAuth credentials
 * @param {object} content - Post or comment data
 * @returns {Promise<object>} - Posted data
 */
async function post(config, content) {
  // Validate inputs
  validate(config)
  validateContent(content)

  const token = await getAccessToken(config)
  const userAgent = config.userAgent || 'OpenClawBot/1.0'

  try {
    // Check if it's a comment
    if (content.thingId) {
      return await postComment(token, userAgent, content)
    } else {
      return await postSubmission(token, userAgent, content)
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Reddit API unreachable. Check your internet connection.')
    }
    throw error
  }
}

/**
 * Submit a post to a subreddit
 */
async function postSubmission(token, userAgent, content) {
  const formData = new URLSearchParams({
    sr: content.subreddit,
    title: content.title,
    kind: content.url ? 'link' : 'self',
    nsfw: content.nsfw ? 'true' : 'false',
    spoiler: content.spoiler ? 'true' : 'false',
  })

  if (content.text) {
    formData.append('text', content.text)
  }
  if (content.url) {
    formData.append('url', content.url)
  }

  const response = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Reddit post failed (${response.status}): ${error}`)
  }

  const data = await response.json()

  if (data.json.errors && data.json.errors.length > 0) {
    throw new Error(`Reddit error: ${JSON.stringify(data.json.errors)}`)
  }

  return {
    success: true,
    platform: 'reddit',
    type: 'post',
    id: data.json.data.id,
    url: data.json.data.url,
    subreddit: content.subreddit,
    raw: data.json.data,
  }
}

/**
 * Post a comment
 */
async function postComment(token, userAgent, content) {
  const formData = new URLSearchParams({
    thing_id: content.thingId,
    text: content.text,
  })

  const response = await fetch('https://oauth.reddit.com/api/comment', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Reddit comment failed (${response.status}): ${error}`)
  }

  const data = await response.json()

  if (data.json.errors && data.json.errors.length > 0) {
    throw new Error(`Reddit error: ${JSON.stringify(data.json.errors)}`)
  }

  return {
    success: true,
    platform: 'reddit',
    type: 'comment',
    id: data.json.data.things[0].data.id,
    raw: data.json.data.things[0].data,
  }
}

module.exports = {
  name: 'reddit',
  displayName: 'Reddit',
  validate,
  validateContent,
  post,

  help: {
    configFormat: {
      clientId: 'App client ID',
      clientSecret: 'App client secret',
      username: 'Reddit username',
      password: 'Reddit password',
      userAgent: '(Optional) Custom user agent',
    },
    getCredentials: 'https://www.reddit.com/prefs/apps → Create App (script type)',
    examples: {
      selfPost: '{ "subreddit": "test", "title": "My Post", "text": "Content here" }',
      linkPost: '{ "subreddit": "test", "title": "Check this", "url": "https://example.com" }',
      comment: '{ "thingId": "t3_abc123", "text": "My comment" }',
      nsfw: '{ "subreddit": "test", "title": "NSFW Post", "text": "Content", "nsfw": true }',
    },
  },
}
