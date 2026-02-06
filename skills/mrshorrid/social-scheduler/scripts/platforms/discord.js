/**
 * Discord Platform - Webhook Implementation
 * Easiest platform - no OAuth required, just webhook URLs!
 */

const fetch = require('node-fetch')

/**
 * Validate Discord webhook URL
 * @param {string} webhookUrl - Discord webhook URL
 * @returns {boolean}
 */
function validate(webhookUrl) {
  if (!webhookUrl || typeof webhookUrl !== 'string') {
    throw new Error('Discord webhook URL must be a string')
  }

  const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/
  if (!webhookPattern.test(webhookUrl)) {
    throw new Error(
      'Invalid Discord webhook URL format.\n\n' +
        'Expected format: https://discord.com/api/webhooks/ID/TOKEN\n\n' +
        'To create a webhook:\n' +
        '1. Open Discord server settings\n' +
        '2. Go to Integrations → Webhooks\n' +
        '3. Click "New Webhook"\n' +
        '4. Copy the webhook URL',
    )
  }

  return true
}

/**
 * Validate message content
 * @param {object|string} content - Message text or structured content
 * @returns {boolean}
 */
function validateContent(content) {
  // Simple text message
  if (typeof content === 'string') {
    if (content.length === 0) {
      throw new Error('Message content cannot be empty')
    }
    if (content.length > 2000) {
      throw new Error(`Message too long: ${content.length} characters (Discord limit is 2000)`)
    }
    return true
  }

  // Structured message object
  if (typeof content !== 'object') {
    throw new Error('Message content must be a string or object')
  }

  // At least one of content or embeds must be present
  if (!content.content && !content.embeds) {
    throw new Error('Message must have either "content" (text) or "embeds"')
  }

  if (content.content && typeof content.content !== 'string') {
    throw new Error('Message content must be a string')
  }

  if (content.content && content.content.length > 2000) {
    throw new Error(
      `Message too long: ${content.content.length} characters (Discord limit is 2000)`,
    )
  }

  if (content.embeds && !Array.isArray(content.embeds)) {
    throw new Error('Embeds must be an array')
  }

  return true
}

/**
 * Post to Discord via webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object|string} content - Message text or structured content
 * @returns {Promise<object>} - Posted message info
 */
async function post(webhookUrl, content) {
  // Validate inputs
  validate(webhookUrl)
  validateContent(content)

  try {
    // Build payload
    let payload

    if (typeof content === 'string') {
      // Simple text message
      payload = { content }
    } else {
      // Structured message
      payload = {
        content: content.content || undefined,
        username: content.username || undefined,
        avatar_url: content.avatarUrl || content.avatar_url || undefined,
        embeds: content.embeds || undefined,
      }
    }

    // Build webhook URL (with optional thread_id)
    let url = webhookUrl
    if (typeof content === 'object' && content.threadId) {
      url += `?thread_id=${content.threadId}`
    }

    // Send the webhook
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Discord webhook failed (${response.status}): ${error}`)
    }

    return {
      success: true,
      platform: 'discord',
      timestamp: new Date().toISOString(),
      // Discord webhooks don't return message ID unless wait=true
      note: 'Message posted successfully',
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      throw new Error('Discord API unreachable. Check your internet connection.')
    }
    throw error
  }
}

/**
 * Helper: Create a rich embed
 * @param {object} options - Embed options
 * @returns {object} - Discord embed object
 */
function createEmbed(options) {
  const embed = {
    title: options.title || undefined,
    description: options.description || undefined,
    url: options.url || undefined,
    color: options.color ? parseInt(options.color.toString().replace('0x', ''), 16) : undefined,
    timestamp: options.timestamp || new Date().toISOString(),
  }

  if (options.thumbnail) {
    embed.thumbnail = { url: options.thumbnail }
  }

  if (options.image) {
    embed.image = { url: options.image }
  }

  if (options.fields && Array.isArray(options.fields)) {
    embed.fields = options.fields
  }

  if (options.footer) {
    embed.footer = typeof options.footer === 'string' ? { text: options.footer } : options.footer
  }

  if (options.author) {
    embed.author = typeof options.author === 'string' ? { name: options.author } : options.author
  }

  return embed
}

module.exports = {
  name: 'discord',
  displayName: 'Discord',
  validate,
  validateContent,
  post,
  createEmbed,

  help: {
    configFormat: 'Webhook URL string: https://discord.com/api/webhooks/ID/TOKEN',
    getCredentials: 'Server Settings → Integrations → Webhooks → New Webhook',
    examples: {
      simple: 'Just a string: "Hello Discord!"',
      structured: '{ "content": "Message", "username": "Custom Bot" }',
      embed: '{ "embeds": [{ "title": "Title", "description": "Text", "color": "0x00FF00" }] }',
      thread: '{ "content": "In thread", "threadId": "1234567890" }',
    },
  },
}
