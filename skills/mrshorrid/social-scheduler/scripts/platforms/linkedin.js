/**
 * LinkedIn Platform - Posts API (2026)
 *
 * Authentication: OAuth 2.0
 * Scopes: w_member_social (personal) or w_organization_social (company page)
 *
 * Config format:
 * {
 *   "platform": "linkedin",
 *   "accessToken": "AQV...",
 *   "author": "urn:li:person:abc123" or "urn:li:organization:123456",
 *   "version": "202601" (optional, defaults to current YYYYMM)
 * }
 */

import fetch from 'node-fetch'

/**
 * Validate LinkedIn configuration
 */
export function validate(config) {
  const errors = []

  if (!config.accessToken || typeof config.accessToken !== 'string') {
    errors.push('accessToken is required (OAuth 2.0 Bearer token)')
  }

  if (!config.author || typeof config.author !== 'string') {
    errors.push('author is required (urn:li:person:{id} or urn:li:organization:{id})')
  } else {
    // Validate URN format
    if (
      !config.author.startsWith('urn:li:person:') &&
      !config.author.startsWith('urn:li:organization:')
    ) {
      errors.push('author must be urn:li:person:{id} or urn:li:organization:{id}')
    }
  }

  // Version is optional - defaults to current YYYYMM
  if (config.version && typeof config.version !== 'string') {
    errors.push('version must be string in YYYYMM format (e.g., "202601")')
  }

  return errors
}

/**
 * Validate post content
 */
export function validateContent(text, media) {
  const errors = []

  // LinkedIn has no strict character limit on commentary, but recommend keeping reasonable
  if (!text || text.trim().length === 0) {
    errors.push('LinkedIn post text cannot be empty')
  }

  if (text && text.length > 3000) {
    errors.push('LinkedIn post text should be under 3000 characters for best engagement')
  }

  // Media validation (if provided)
  if (media) {
    if (typeof media !== 'object') {
      errors.push('media must be an object with {type, urn} or {type, url, title}')
    } else {
      const validTypes = ['image', 'video', 'document', 'article']
      if (!media.type || !validTypes.includes(media.type)) {
        errors.push(`media.type must be one of: ${validTypes.join(', ')}`)
      }

      // For uploaded media (already on LinkedIn)
      if (media.urn) {
        const validUrnPrefixes = ['urn:li:image:', 'urn:li:video:', 'urn:li:document:']
        const isValid = validUrnPrefixes.some((prefix) => media.urn.startsWith(prefix))
        if (!isValid) {
          errors.push('media.urn must start with urn:li:image:, urn:li:video:, or urn:li:document:')
        }
      }

      // For article posts
      if (media.type === 'article') {
        if (!media.url || typeof media.url !== 'string') {
          errors.push('media.url is required for article posts')
        }
        if (!media.title || typeof media.title !== 'string') {
          errors.push('media.title is required for article posts')
        }
      }
    }
  }

  return errors
}

/**
 * Get current LinkedIn API version (YYYYMM format)
 */
function getCurrentVersion() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

/**
 * Post to LinkedIn
 */
export async function post(config, text, media = null) {
  const endpoint = 'https://api.linkedin.com/rest/posts'
  const version = config.version || getCurrentVersion()

  // Build post payload
  const payload = {
    author: config.author,
    commentary: text,
    visibility: config.visibility || 'PUBLIC',
    distribution: {
      feedDistribution: config.feedDistribution || 'MAIN_FEED',
      targetEntities: config.targetEntities || [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  // Add media content if provided
  if (media) {
    if (media.type === 'article') {
      payload.content = {
        article: {
          source: media.url,
          title: media.title,
          description: media.description || '',
        },
      }

      // Add thumbnail if provided
      if (media.thumbnail) {
        payload.content.article.thumbnail = media.thumbnail
      }
    } else {
      // Image, video, or document
      payload.content = {
        media: {
          id: media.urn,
        },
      }

      // Add title if provided
      if (media.title) {
        payload.content.media.title = media.title
      }

      // Add alt text if provided
      if (media.altText) {
        payload.content.media.altText = media.altText
      }
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': version,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LinkedIn API error (${response.status}): ${errorText}`)
  }

  // LinkedIn returns 201 with post URN in x-restli-id header
  const postUrn = response.headers.get('x-restli-id')

  // Construct post URL
  let postUrl = null
  if (postUrn) {
    // Extract ID from URN (urn:li:share:123 or urn:li:ugcPost:123)
    const id = postUrn.split(':').pop()
    const urnType = postUrn.includes('share') ? 'share' : 'ugcPost'
    postUrl = `https://www.linkedin.com/feed/update/${urnType}:${id}/`
  }

  return {
    success: true,
    postUrn,
    url: postUrl,
    platform: 'linkedin',
  }
}

/**
 * Module exports
 */
export default {
  validate,
  validateContent,
  post,
}
