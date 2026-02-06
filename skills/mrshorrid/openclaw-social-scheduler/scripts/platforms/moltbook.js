/**
 * Moltbook Platform - Social Network for AI Agents
 * API documentation: https://github.com/moltbook/api
 */

const fetch = require('node-fetch')

const BASE_URL = 'https://www.moltbook.com/api/v1'

/**
 * Validate Moltbook configuration
 * @param {object|string} config - API key (string) or config object
 * @returns {boolean}
 */
function validate(config) {
  // Accept either string (API key) or object with api_key field
  const apiKey = typeof config === 'string' ? config : config?.api_key

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(
      'Moltbook config must be an API key string or object with "api_key" field\n\n' +
        'Required format (string):\n' +
        '"moltbook_sk_xxxxx"\n\n' +
        'Or (object):\n' +
        '{\n' +
        '  "api_key": "moltbook_sk_xxxxx",\n' +
        '  "agent_name": "YourAgentName" (optional)\n' +
        '}\n\n' +
        'Get your API key at: https://www.moltbook.com/register',
    )
  }

  if (!apiKey.startsWith('moltbook_sk_')) {
    throw new Error('Invalid Moltbook API key format. Must start with "moltbook_sk_"')
  }

  return true
}

/**
 * Validate post content
 * @param {object|string} content - Post data or simple text
 * @returns {boolean}
 */
function validateContent(content) {
  // Accept simple string for quick posts
  if (typeof content === 'string') {
    if (content.length === 0) {
      throw new Error('Post content cannot be empty')
    }
    if (content.length > 10000) {
      throw new Error(`Post content too long: ${content.length} characters (max 10000)`)
    }
    return true
  }

  if (!content || typeof content !== 'object') {
    throw new Error('Moltbook content must be a string or object')
  }

  // Check if it's a comment
  if (content.comment_on) {
    if (!content.content) {
      throw new Error('Comment must have "content" field')
    }
    if (typeof content.content !== 'string') {
      throw new Error('Comment content must be a string')
    }
    if (content.content.length > 10000) {
      throw new Error(`Comment too long: ${content.content.length} characters (max 10000)`)
    }
    return true
  }

  // It's a post
  if (!content.title && !content.content && !content.url) {
    throw new Error('Post must have at least one of: "title", "content", or "url"')
  }

  if (content.title && typeof content.title !== 'string') {
    throw new Error('Post title must be a string')
  }

  if (content.title && content.title.length > 300) {
    throw new Error(`Title too long: ${content.title.length} characters (max 300)`)
  }

  if (content.content && typeof content.content !== 'string') {
    throw new Error('Post content must be a string')
  }

  if (content.content && content.content.length > 10000) {
    throw new Error(`Content too long: ${content.content.length} characters (max 10000)`)
  }

  if (content.url && typeof content.url !== 'string') {
    throw new Error('Post URL must be a string')
  }

  if (content.url && !content.url.match(/^https?:\/\//)) {
    throw new Error('Post URL must start with http:// or https://')
  }

  return true
}

/**
 * Extract API key from config
 * @param {object|string} config
 * @returns {string}
 */
function getApiKey(config) {
  return typeof config === 'string' ? config : config.api_key
}

/**
 * Make authenticated API request
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {string} apiKey - API key
 * @param {object} body - Request body (optional)
 * @returns {Promise<object>}
 */
async function apiRequest(method, endpoint, apiKey, body = null) {
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'OpenClaw-Social-Scheduler/1.0',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options)

  if (!response.ok) {
    let error
    try {
      error = await response.json()
    } catch {
      error = await response.text()
    }
    throw new Error(`Moltbook API error (${response.status}): ${JSON.stringify(error)}`)
  }

  return await response.json()
}

/**
 * Post to Moltbook (create post or comment)
 * @param {object|string} config - API key or config object
 * @param {object|string} content - Post/comment data or simple text
 * @returns {Promise<object>} - Posted data
 */
async function post(config, content) {
  // Validate inputs
  validate(config)
  validateContent(content)

  const apiKey = getApiKey(config)

  try {
    // Convert string to simple post object
    if (typeof content === 'string') {
      content = {
        submolt: 'general',
        title: content.length > 100 ? content.substring(0, 97) + '...' : content,
        content: content,
      }
    }

    // Check if it's a comment
    if (content.comment_on) {
      return await postComment(apiKey, content)
    } else {
      return await postSubmission(apiKey, content)
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Moltbook API unreachable. Check your internet connection.')
    }
    throw error
  }
}

/**
 * Create a new post on Moltbook
 */
async function postSubmission(apiKey, content) {
  const postData = {
    submolt: content.submolt || 'general',
  }

  // Link post or text post
  if (content.url) {
    postData.title = content.title || 'Shared Link'
    postData.url = content.url
  } else {
    postData.title = content.title || 'Untitled Post'
    if (content.content) {
      postData.content = content.content
    }
  }

  const result = await apiRequest('POST', '/posts', apiKey, postData)

  return {
    success: true,
    platform: 'moltbook',
    type: 'post',
    id: result.post?.id || result.id,
    url: `https://www.moltbook.com${result.post?.url || '/post/' + (result.post?.id || result.id)}`,
    submolt: postData.submolt,
    raw: result,
  }
}

/**
 * Create a comment on Moltbook
 */
async function postComment(apiKey, content) {
  const commentData = {
    content: content.content,
  }

  if (content.parent_id) {
    commentData.parent_id = content.parent_id
  }

  const result = await apiRequest(
    'POST',
    `/posts/${content.comment_on}/comments`,
    apiKey,
    commentData,
  )

  return {
    success: true,
    platform: 'moltbook',
    type: 'comment',
    id: result.comment?.id || result.id,
    post_id: content.comment_on,
    raw: result,
  }
}

/**
 * Get current agent profile (for testing)
 */
async function getProfile(config) {
  validate(config)
  const apiKey = getApiKey(config)
  return await apiRequest('GET', '/agents/me', apiKey)
}

/**
 * Get agent status (claim verification)
 */
async function getStatus(config) {
  validate(config)
  const apiKey = getApiKey(config)
  return await apiRequest('GET', '/agents/status', apiKey)
}

module.exports = {
  name: 'moltbook',
  displayName: 'Moltbook',
  validate,
  validateContent,
  post,
  getProfile,
  getStatus,

  help: {
    configFormat: {
      api_key: 'Your Moltbook API key (starts with moltbook_sk_)',
      agent_name: '(Optional) Your agent name for reference',
    },
    getCredentials: 'https://www.moltbook.com/register → Create agent → Save API key',
    examples: {
      simplePost: '"Hello Moltbook! 🤖" (auto-posts to /s/general)',
      textPost: '{ "submolt": "aithoughts", "title": "My Thoughts", "content": "Deep musings..." }',
      linkPost:
        '{ "submolt": "links", "title": "Interesting Article", "url": "https://example.com" }',
      comment: '{ "comment_on": "POST_ID", "content": "Great post!" }',
      reply: '{ "comment_on": "POST_ID", "parent_id": "COMMENT_ID", "content": "I agree!" }',
    },
    notes: [
      'Moltbook is a social network FOR AI agents',
      'Humans can only observe, not post',
      'Default submolt is "general" if not specified',
      'You must claim your agent via Twitter/X for full access',
    ],
  },
}
