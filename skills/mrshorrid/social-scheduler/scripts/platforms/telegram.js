/**
 * Telegram Platform Module
 * Uses Telegram Bot API for sending messages, photos, videos, and documents
 *
 * Required config:
 * - telegram.botToken (from @BotFather)
 * - telegram.chatId (channel username @channelname or numeric chat_id)
 *
 * Optional:
 * - telegram.parseMode (Markdown, MarkdownV2, HTML, or undefined)
 * - telegram.disableNotification (true/false)
 * - telegram.disableWebPagePreview (true/false)
 */

const fs = require('fs')
const path = require('path')

// Validate Telegram configuration
function validate(config) {
  if (!config.telegram) {
    return 'Missing telegram config section'
  }

  if (!config.telegram.botToken) {
    return 'Missing telegram.botToken (get from @BotFather)'
  }

  if (!config.telegram.chatId) {
    return 'Missing telegram.chatId (channel @username or numeric chat_id)'
  }

  // Validate parse mode if provided
  const validParseModes = ['Markdown', 'MarkdownV2', 'HTML']
  if (config.telegram.parseMode && !validParseModes.includes(config.telegram.parseMode)) {
    return `Invalid telegram.parseMode. Must be one of: ${validParseModes.join(', ')}`
  }

  return null // Valid
}

// Validate post content
function validateContent(content) {
  if (!content.text && !content.media) {
    return 'Post must have either text or media'
  }

  // Telegram message length limits
  if (content.text && content.text.length > 4096) {
    return 'Text too long (max 4096 characters for Telegram)'
  }

  // Caption length for media
  if (content.media && content.caption && content.caption.length > 1024) {
    return 'Caption too long (max 1024 characters for Telegram media)'
  }

  // Validate media type if present
  if (content.media) {
    const validTypes = ['photo', 'video', 'document', 'animation', 'audio', 'voice']
    if (!validTypes.includes(content.mediaType)) {
      return `Invalid mediaType. Must be one of: ${validTypes.join(', ')}`
    }
  }

  return null // Valid
}

// Post to Telegram
async function post(config, content) {
  const { botToken, chatId, parseMode, disableNotification, disableWebPagePreview } =
    config.telegram

  try {
    let result

    if (content.media) {
      // Post with media
      result = await postMedia(
        botToken,
        chatId,
        content.media,
        content.mediaType || 'photo',
        content.caption || content.text,
        parseMode,
        disableNotification,
      )
    } else {
      // Text-only post
      result = await postText(
        botToken,
        chatId,
        content.text,
        parseMode,
        disableNotification,
        disableWebPagePreview,
      )
    }

    return {
      success: true,
      messageId: result.message_id,
      response: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

// Post text message
async function postText(
  botToken,
  chatId,
  text,
  parseMode,
  disableNotification,
  disableWebPagePreview,
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const body = {
    chat_id: chatId,
    text: text,
  }

  if (parseMode) {
    body.parse_mode = parseMode
  }

  if (disableNotification) {
    body.disable_notification = true
  }

  if (disableWebPagePreview) {
    body.disable_web_page_preview = true
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.description || 'Telegram API error')
  }

  return data.result
}

// Post with media (photo, video, document, etc.)
async function postMedia(
  botToken,
  chatId,
  mediaPath,
  mediaType,
  caption,
  parseMode,
  disableNotification,
) {
  // Map media types to Telegram API methods
  const methodMap = {
    photo: 'sendPhoto',
    video: 'sendVideo',
    document: 'sendDocument',
    animation: 'sendAnimation',
    audio: 'sendAudio',
    voice: 'sendVoice',
  }

  const method = methodMap[mediaType]
  if (!method) {
    throw new Error(`Unsupported media type: ${mediaType}`)
  }

  const url = `https://api.telegram.org/bot${botToken}/${method}`

  // Use dynamic import for form-data
  const FormData = (await import('form-data')).default
  const form = new FormData()

  // Add chat_id
  form.append('chat_id', chatId)

  // Add media file
  const mediaField = mediaType === 'animation' ? 'animation' : mediaType

  if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
    // URL - send as string
    form.append(mediaField, mediaPath)
  } else {
    // Local file - upload
    const fullPath = path.isAbsolute(mediaPath) ? mediaPath : path.join(process.cwd(), mediaPath)

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Media file not found: ${fullPath}`)
    }

    form.append(mediaField, fs.createReadStream(fullPath))
  }

  // Add caption if provided
  if (caption) {
    form.append('caption', caption)
  }

  if (parseMode) {
    form.append('parse_mode', parseMode)
  }

  if (disableNotification) {
    form.append('disable_notification', 'true')
  }

  const response = await fetch(url, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.description || 'Telegram API error')
  }

  return data.result
}

module.exports = {
  validate,
  validateContent,
  post,
}
