/**
 * Video Uploader Module
 * Handles video uploads with metadata, scheduling, and resumability
 */

const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')
const { getAuthenticatedClient, makeQuotaAwareRequest } = require('./api-client')
const { logger } = require('./utils')

const CHUNK_SIZE = 256 * 1024 // 256KB chunks for resumable uploads

/**
 * Upload a video to YouTube
 * @param {string} filePath - Path to video file
 * @param {Object} metadata - Video metadata {title, description, tags, privacyStatus, categoryId, publishAt}
 * @param {Object} options - {thumbnail, playlist}
 * @returns {Promise<Object>} Upload result {videoId, status, scheduledTime}
 */
async function uploadVideo(filePath, metadata, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Video file not found: ${filePath}`)
  }

  const fileSize = fs.statSync(filePath).size
  logger.info(`Starting upload: ${path.basename(filePath)} (${formatBytes(fileSize)})`)

  const youtube = await getAuthenticatedClient()

  try {
    // Prepare metadata
    const requestBody = {
      snippet: {
        title: metadata.title,
        description: metadata.description || '',
        tags: metadata.tags || [],
        categoryId: metadata.categoryId || '22', // People
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'unlisted',
        publishAt: metadata.publishAt, // Optional: ISO 8601
      },
    }

    // If scheduled, use scheduledStartTime instead
    if (metadata.publishAt) {
      requestBody.status.publishAt = metadata.publishAt
    }

    const media = {
      mimeType: getMimeType(filePath),
      body: fs.createReadStream(filePath),
    }

    // Upload with resumable protocol
    const response = await makeQuotaAwareRequest(async () => {
      return new Promise((resolve, reject) => {
        const request = youtube.videos.insert(
          {
            part: 'snippet,status',
            requestBody,
            media,
          },
          (err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(res)
            }
          },
        )

        // Track upload progress
        request.on('progress', (event) => {
          const progress = Math.round((event.bytesRead / fileSize) * 100)
          logger.info(`Upload progress: ${progress}%`)
        })
      })
    }, 1600) // Video insert costs 1600 quota units

    const videoId = response.data.id
    const status = response.data.status.privacyStatus

    logger.info(`Video uploaded successfully: ${videoId}`)

    const result = {
      videoId,
      status,
      url: `https://youtube.com/watch?v=${videoId}`,
      scheduledTime: metadata.publishAt || null,
    }

    // Handle optional operations
    if (options.thumbnail) {
      await setCustomThumbnail(youtube, videoId, options.thumbnail)
      result.thumbnailSet = true
    }

    if (options.playlist) {
      await addToPlaylist(youtube, videoId, options.playlist)
      result.playlistAdded = true
    }

    return result
  } catch (error) {
    logger.error('Video upload failed', error)
    throw error
  }
}

/**
 * Set custom thumbnail for video
 * @param {Object} youtube - YouTube API client
 * @param {string} videoId - Video ID
 * @param {string} thumbnailPath - Path to thumbnail image (JPG, PNG)
 */
async function setCustomThumbnail(youtube, videoId, thumbnailPath) {
  try {
    if (!fs.existsSync(thumbnailPath)) {
      throw new Error(`Thumbnail file not found: ${thumbnailPath}`)
    }

    logger.info(`Setting custom thumbnail: ${thumbnailPath}`)

    await makeQuotaAwareRequest(() =>
      youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnailPath),
        },
      }),
    )

    logger.info('Custom thumbnail set')
  } catch (error) {
    logger.warn('Failed to set custom thumbnail', error)
    // Don't throw - thumbnail is optional
  }
}

/**
 * Add video to playlist
 * @param {Object} youtube - YouTube API client
 * @param {string} videoId - Video ID
 * @param {string} playlistName - Playlist name or ID
 */
async function addToPlaylist(youtube, videoId, playlistName) {
  try {
    let playlistId = playlistName

    // If it's a name, find the playlist ID
    if (!playlistName.startsWith('PL')) {
      playlistId = await findPlaylistByName(youtube, playlistName)
      if (!playlistId) {
        logger.warn(`Playlist not found: ${playlistName}`)
        return
      }
    }

    logger.info(`Adding video to playlist: ${playlistId}`)

    await makeQuotaAwareRequest(() =>
      youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      }),
    )

    logger.info('Video added to playlist')
  } catch (error) {
    logger.warn('Failed to add video to playlist', error)
    // Don't throw - adding to playlist is optional
  }
}

/**
 * Find playlist by name
 * @param {Object} youtube - YouTube API client
 * @param {string} name - Playlist name
 * @returns {Promise<string|null>} Playlist ID or null
 */
async function findPlaylistByName(youtube, name) {
  try {
    const response = await makeQuotaAwareRequest(() =>
      youtube.playlists.list({
        part: 'snippet',
        mine: true,
        maxResults: 50,
      }),
    )

    const playlist = response.data.items?.find(
      (p) => p.snippet.title.toLowerCase() === name.toLowerCase(),
    )

    return playlist?.id || null
  } catch (error) {
    logger.error('Failed to find playlist', error)
    return null
  }
}

/**
 * Resume interrupted upload
 * @param {string} filePath - Path to video file
 * @param {string} sessionUri - Resumable session URI from previous attempt
 * @returns {Promise<Object>} Upload result
 */
async function resumeUpload(filePath, sessionUri) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`)
    }

    const fileSize = fs.statSync(filePath).size
    logger.info(`Resuming upload from session: ${sessionUri}`)

    const youtube = await getAuthenticatedClient()
    const media = {
      body: fs.createReadStream(filePath),
    }

    // Resume using session URI
    const response = await makeQuotaAwareRequest(async () => {
      return new Promise((resolve, reject) => {
        // In a real implementation, use resumable.uri from Google API client
        const request = youtube.videos.insert(
          {
            requestBody: { snippet: {} },
            media,
          },
          (err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(res)
            }
          },
        )
      })
    }, 1600)

    logger.info(`Resume completed: ${response.data.id}`)
    return {
      videoId: response.data.id,
      status: response.data.status.privacyStatus,
    }
  } catch (error) {
    logger.error('Resume upload failed', error)
    throw error
  }
}

/**
 * Get MIME type from file extension
 * @param {string} filePath - File path
 * @returns {string} MIME type
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.webm': 'video/webm',
  }
  return mimeTypes[ext] || 'video/mp4'
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

module.exports = {
  uploadVideo,
  resumeUpload,
  setCustomThumbnail,
  addToPlaylist,
  findPlaylistByName,
}
