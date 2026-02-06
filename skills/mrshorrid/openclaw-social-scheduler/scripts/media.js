/**
 * Media Upload Module
 * Handles image/video uploads across all platforms
 *
 * Supports:
 * - Local file paths
 * - URLs (download then upload)
 * - Base64 data
 * - Buffers
 */

const fs = require('fs').promises
const fetch = require('node-fetch')
const path = require('path')

class MediaUploader {
  constructor() {
    this.supportedFormats = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      video: ['.mp4', '.mov', '.avi', '.webm'],
    }

    this.platformLimits = {
      twitter: {
        maxSize: 5 * 1024 * 1024,
        formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      },
      reddit: { maxSize: 20 * 1024 * 1024, formats: ['image/jpeg', 'image/png', 'image/gif'] },
      discord: {
        maxSize: 8 * 1024 * 1024,
        formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      },
      mastodon: {
        maxSize: 8 * 1024 * 1024,
        formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      },
      bluesky: { maxSize: 1 * 1024 * 1024, formats: ['image/jpeg', 'image/png'] },
    }
  }

  /**
   * Load media from various sources
   * @param {string|Buffer} source - File path, URL, or Buffer
   * @returns {Promise<{buffer: Buffer, mimeType: string, filename: string}>}
   */
  async loadMedia(source) {
    try {
      // If it's a Buffer, return directly
      if (Buffer.isBuffer(source)) {
        return {
          buffer: source,
          mimeType: 'application/octet-stream',
          filename: 'upload.bin',
        }
      }

      // If it's a URL
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return await this.loadFromUrl(source)
      }

      // If it's a base64 data URI
      if (source.startsWith('data:')) {
        return this.loadFromDataUri(source)
      }

      // Otherwise, treat as file path
      return await this.loadFromFile(source)
    } catch (error) {
      throw new Error(`Failed to load media: ${error.message}`)
    }
  }

  /**
   * Load media from local file
   */
  async loadFromFile(filePath) {
    const buffer = await fs.readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeType = this.getMimeType(ext)
    const filename = path.basename(filePath)

    return { buffer, mimeType, filename }
  }

  /**
   * Load media from URL
   */
  async loadFromUrl(url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const buffer = await response.buffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const urlPath = new URL(url).pathname
    const filename = path.basename(urlPath) || 'download'

    return { buffer, mimeType: contentType, filename }
  }

  /**
   * Load media from data URI (base64)
   */
  loadFromDataUri(dataUri) {
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid data URI format')
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')
    const ext = this.getExtensionFromMime(mimeType)
    const filename = `upload${ext}`

    return { buffer, mimeType, filename }
  }

  /**
   * Validate media for platform
   */
  validateForPlatform(platform, buffer, mimeType) {
    const limits = this.platformLimits[platform]
    if (!limits) {
      throw new Error(`Unknown platform: ${platform}`)
    }

    // Check file size
    if (buffer.length > limits.maxSize) {
      const maxMB = (limits.maxSize / (1024 * 1024)).toFixed(1)
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1)
      throw new Error(`File too large: ${sizeMB}MB (max ${maxMB}MB for ${platform})`)
    }

    // Check format
    if (!limits.formats.includes(mimeType)) {
      throw new Error(
        `Unsupported format: ${mimeType} (${platform} supports: ${limits.formats.join(', ')})`,
      )
    }

    return true
  }

  /**
   * Upload to Twitter/X
   */
  async uploadToTwitter(client, media) {
    const { buffer, mimeType } = await this.loadMedia(media)
    this.validateForPlatform('twitter', buffer, mimeType)

    try {
      const mediaId = await client.v1.uploadMedia(buffer, { mimeType })
      return mediaId
    } catch (error) {
      throw new Error(`Twitter upload failed: ${error.message}`)
    }
  }

  /**
   * Upload to Reddit
   */
  async uploadToReddit(accessToken, subreddit, media) {
    const { buffer, mimeType, filename } = await this.loadMedia(media)
    this.validateForPlatform('reddit', buffer, mimeType)

    try {
      // Step 1: Get upload lease
      const leaseResponse = await fetch('https://oauth.reddit.com/api/media/asset.json', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          filepath: filename,
          mimetype: mimeType,
        }),
      })

      const lease = await leaseResponse.json()
      if (lease.errors && lease.errors.length > 0) {
        throw new Error(`Reddit lease error: ${JSON.stringify(lease.errors)}`)
      }

      // Step 2: Upload to S3
      const formData = new (require('form-data'))()
      Object.entries(lease.args.fields).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('file', buffer, { filename })

      await fetch(lease.args.action, {
        method: 'POST',
        body: formData,
      })

      // Step 3: Return asset URL
      return lease.asset.asset_id
    } catch (error) {
      throw new Error(`Reddit upload failed: ${error.message}`)
    }
  }

  /**
   * Upload to Mastodon
   */
  async uploadToMastodon(M, media) {
    const { buffer, mimeType, filename } = await this.loadMedia(media)
    this.validateForPlatform('mastodon', buffer, mimeType)

    try {
      const FormData = require('form-data')
      const form = new FormData()
      form.append('file', buffer, {
        filename,
        contentType: mimeType,
      })

      const result = await M.post('media', form)
      return result.data.id
    } catch (error) {
      throw new Error(`Mastodon upload failed: ${error.message}`)
    }
  }

  /**
   * Upload to Bluesky
   */
  async uploadToBluesky(agent, media) {
    const { buffer, mimeType } = await this.loadMedia(media)
    this.validateForPlatform('bluesky', buffer, mimeType)

    try {
      const response = await agent.uploadBlob(buffer, { encoding: mimeType })
      return response.data.blob
    } catch (error) {
      throw new Error(`Bluesky upload failed: ${error.message}`)
    }
  }

  /**
   * Get MIME type from extension
   */
  getMimeType(ext) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Get extension from MIME type
   */
  getExtensionFromMime(mimeType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/webm': '.webm',
    }
    return extensions[mimeType] || '.bin'
  }
}

module.exports = new MediaUploader()
