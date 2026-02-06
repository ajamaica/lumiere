/**
 * Channel Analytics Module
 * Retrieves and analyzes YouTube channel statistics
 */

const { getAuthenticatedClient, makeQuotaAwareRequest } = require('./api-client')
const { logger } = require('./utils')

/**
 * Get comprehensive channel statistics
 * @param {Object} options - { days: 30, detailed: false }
 * @returns {Promise<Object>} Channel statistics
 */
async function getChannelStats(options = {}) {
  const { days = 30, detailed = false } = options
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Fetching channel stats for last ${days} days`)

    // Get channel ID and basic info
    const channelRes = await makeQuotaAwareRequest(() =>
      youtube.channels.list({
        part: 'statistics,snippet,contentDetails',
        mine: true,
      }),
    )

    if (!channelRes.data.items || !channelRes.data.items[0]) {
      throw new Error('No channel found. Ensure you are authenticated correctly.')
    }

    const channel = channelRes.data.items[0]
    const channelId = channel.id
    const stats = channel.statistics

    const result = {
      channelId,
      channelTitle: channel.snippet.title,
      description: channel.snippet.description,
      totalViews: parseInt(stats.viewCount || 0),
      subscriberCount: parseInt(stats.subscriberCount || 0),
      hiddenSubscriberCount: stats.hiddenSubscriberCount === 'true',
      videoCount: parseInt(stats.videoCount || 0),
      uploadPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    }

    // Get detailed metrics if requested
    if (detailed) {
      result.topVideos = await getTopVideos(youtube, channelId, 10)
      result.recentPerformance = await getRecentPerformance(youtube, channelId, days)
      result.estimatedMinutesWatched = await estimateWatchTime(youtube, channelId)
    } else {
      // Get top 5 videos by default
      result.topVideos = await getTopVideos(youtube, channelId, 5)
      result.estimatedMinutesWatched = await estimateWatchTime(youtube, channelId)
    }

    logger.info('Channel stats retrieved successfully')
    return result
  } catch (error) {
    logger.error('Failed to get channel stats', error)
    throw error
  }
}

/**
 * Get top performing videos
 * @param {Object} youtube - YouTube API client
 * @param {string} channelId - Channel ID
 * @param {number} limit - Number of videos to return
 * @returns {Promise<Array>} Top videos with metrics
 */
async function getTopVideos(youtube, channelId, limit = 10) {
  try {
    // Get videos from uploads playlist
    const videosRes = await makeQuotaAwareRequest(() =>
      youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId: channelId,
        maxResults: 50,
      }),
    )

    if (!videosRes.data.items) return []

    const videoIds = videosRes.data.items
      .map((item) => item.contentDetails.videoId)
      .filter((id) => id)

    // Get stats for these videos
    const statsRes = await makeQuotaAwareRequest(() =>
      youtube.videos.list({
        part: 'statistics,snippet,contentDetails',
        id: videoIds.join(','),
        maxResults: 50,
      }),
    )

    const videos = statsRes.data.items
      .map((video) => ({
        videoId: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        views: parseInt(video.statistics.viewCount || 0),
        likes: parseInt(video.statistics.likeCount || 0),
        comments: parseInt(video.statistics.commentCount || 0),
        duration: video.contentDetails.duration,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)

    return videos
  } catch (error) {
    logger.error('Failed to get top videos', error)
    return []
  }
}

/**
 * Estimate recent channel performance
 * @param {Object} youtube - YouTube API client
 * @param {string} channelId - Channel ID
 * @param {number} days - Days to look back
 * @returns {Promise<Object>} Recent performance metrics
 */
async function getRecentPerformance(youtube, channelId, days = 30) {
  try {
    const sinceDateISOString = new Date(Date.now() - days * 86400000).toISOString()

    const videosRes = await makeQuotaAwareRequest(() =>
      youtube.search.list({
        part: 'snippet',
        forMineChannel: true,
        publishedAfter: sinceDateISOString,
        maxResults: 50,
        type: 'video',
      }),
    )

    const recentVideoIds =
      videosRes.data.items?.map((item) => item.id.videoId).filter((id) => id) || []

    if (recentVideoIds.length === 0) {
      return {
        newViews: 0,
        newSubscribers: 0,
        avgViewsPerVideo: 0,
      }
    }

    const statsRes = await makeQuotaAwareRequest(() =>
      youtube.videos.list({
        part: 'statistics',
        id: recentVideoIds.join(','),
      }),
    )

    const stats = statsRes.data.items || []
    const totalViews = stats.reduce((sum, v) => sum + parseInt(v.statistics.viewCount || 0), 0)

    return {
      newViews: totalViews,
      recentVideoCount: recentVideoIds.length,
      avgViewsPerVideo: Math.round(totalViews / recentVideoIds.length),
    }
  } catch (error) {
    logger.error('Failed to get recent performance', error)
    return {
      newViews: 0,
      recentVideoCount: 0,
      avgViewsPerVideo: 0,
    }
  }
}

/**
 * Estimate total watch time from available metrics
 * @param {Object} youtube - YouTube API client
 * @param {string} channelId - Channel ID
 * @returns {Promise<number>} Estimated minutes watched
 */
async function estimateWatchTime(youtube, channelId) {
  try {
    // YouTube doesn't expose raw watch time via API for channels
    // We estimate based on view counts and typical video length
    const videosRes = await makeQuotaAwareRequest(() =>
      youtube.search.list({
        part: 'snippet,contentDetails',
        forMineChannel: true,
        maxResults: 50,
        type: 'video',
      }),
    )

    const videoIds = videosRes.data.items?.map((item) => item.id.videoId).filter((id) => id) || []

    if (videoIds.length === 0) return 0

    const statsRes = await makeQuotaAwareRequest(() =>
      youtube.videos.list({
        part: 'statistics,contentDetails',
        id: videoIds.join(','),
      }),
    )

    // Simple estimate: average views * estimated watch percentage * avg duration
    let totalMinutes = 0
    statsRes.data.items?.forEach((video) => {
      const views = parseInt(video.statistics.viewCount || 0)
      const duration = parseDuration(video.contentDetails.duration)
      const estimatedWatchPercentage = 0.6 // Assume 60% of viewers watch the whole thing
      totalMinutes += (views * duration * estimatedWatchPercentage) / 100
    })

    return Math.round(totalMinutes)
  } catch (error) {
    logger.error('Failed to estimate watch time', error)
    return 0
  }
}

/**
 * Parse ISO 8601 duration to minutes
 * @param {string} duration - Duration in format PT1H30M20S
 * @returns {number} Duration in minutes
 */
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  let minutes = 0

  if (match[1]) minutes += parseInt(match[1]) * 60
  if (match[2]) minutes += parseInt(match[2])
  if (match[3]) minutes += Math.round(parseInt(match[3]) / 60)

  return minutes || 1 // Default to 1 minute if parsing fails
}

/**
 * Get current API quota status
 * @returns {Promise<Object>} Quota info
 */
async function getQuotaStatus() {
  try {
    // Read quota tracking from local file
    const quotaFile = require('path').join(
      process.env.HOME,
      '.clawd-youtube',
      'quota-tracking.json',
    )

    let quotaData = {
      dailyQuota: 1000000,
      used: 0,
      resetTime: new Date().toISOString(),
    }

    if (require('fs').existsSync(quotaFile)) {
      const existing = JSON.parse(require('fs').readFileSync(quotaFile, 'utf8'))
      const now = new Date()
      const resetTime = new Date(existing.resetTime)

      // Reset quota at midnight UTC
      if (now.getUTCDate() !== resetTime.getUTCDate()) {
        quotaData.resetTime = now.toISOString()
        quotaData.used = 0
      } else {
        quotaData = existing
      }
    }

    quotaData.remaining = quotaData.dailyQuota - quotaData.used

    return quotaData
  } catch (error) {
    logger.error('Failed to get quota status', error)
    return {
      dailyQuota: 1000000,
      used: 0,
      remaining: 1000000,
    }
  }
}

/**
 * Record API usage for quota tracking
 * @param {number} units - Units consumed
 */
async function recordQuotaUsage(units) {
  try {
    const fs = require('fs')
    const path = require('path')

    const quotaFile = path.join(process.env.HOME, '.clawd-youtube', 'quota-tracking.json')
    const quotaData = await getQuotaStatus()

    quotaData.used += units
    quotaData.lastUpdate = new Date().toISOString()

    if (!fs.existsSync(path.dirname(quotaFile))) {
      fs.mkdirSync(path.dirname(quotaFile), { recursive: true })
    }

    fs.writeFileSync(quotaFile, JSON.stringify(quotaData, null, 2))

    if ((quotaData.used / quotaData.dailyQuota) * 100 > 80) {
      logger.warn(`Quota usage at ${((quotaData.used / quotaData.dailyQuota) * 100).toFixed(1)}%`)
    }
  } catch (error) {
    logger.error('Failed to record quota usage', error)
  }
}

module.exports = {
  getChannelStats,
  getTopVideos,
  getRecentPerformance,
  estimateWatchTime,
  getQuotaStatus,
  recordQuotaUsage,
}
