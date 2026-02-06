/**
 * Comment Manager Module
 * Handles reading, analyzing, and replying to YouTube comments
 */

const { getAuthenticatedClient, makeQuotaAwareRequest } = require('./api-client')
const { logger } = require('./utils')

/**
 * List comments on channel or specific video
 * @param {string} videoId - Video ID (optional, gets all if null)
 * @param {Object} options - {unread: false, limit: 20}
 * @returns {Promise<Array>} Comments array
 */
async function listComments(videoId = null, options = {}) {
  const { unread = false, limit = 20 } = options
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Fetching comments (${videoId ? 'video: ' + videoId : 'all videos'})`)

    let allComments = []
    let pageToken = null

    do {
      let requestParams

      if (videoId) {
        // Get comments for specific video
        requestParams = {
          part: 'snippet,replies',
          videoId,
          maxResults: Math.min(limit - allComments.length, 20),
          pageToken,
          textFormat: 'plainText',
        }
      } else {
        // Get comments from all channel videos
        requestParams = {
          part: 'snippet,replies',
          forChannelId: true,
          maxResults: Math.min(limit - allComments.length, 20),
          pageToken,
          textFormat: 'plainText',
          allThreadsRelated: true,
        }
      }

      const response = await makeQuotaAwareRequest(() => youtube.commentThreads.list(requestParams))

      // Process comment threads
      response.data.items?.forEach((thread) => {
        const topComment = thread.snippet.topLevelComment.snippet

        const comment = {
          id: thread.id,
          videoId: thread.snippet.videoId,
          authorName: topComment.authorDisplayName,
          authorId: topComment.authorChannelId?.value || 'unknown',
          text: topComment.textDisplay,
          likes: topComment.likeCount,
          publishedAt: topComment.publishedAt,
          replyCount: thread.snippet.replyCount,
          canReply: thread.canReply,
          isRead: thread.snippet.canReply === false ? true : false, // Rough estimate
        }

        if (!unread || !comment.isRead) {
          allComments.push(comment)
        }
      })

      pageToken = response.data.nextPageToken
    } while (pageToken && allComments.length < limit)

    logger.info(`Retrieved ${allComments.length} comments`)
    return allComments.slice(0, limit)
  } catch (error) {
    logger.error('Failed to list comments', error)
    throw error
  }
}

/**
 * Get detailed view of a single comment with context
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Comment details
 */
async function getCommentDetails(commentId) {
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Fetching comment details: ${commentId}`)

    const response = await makeQuotaAwareRequest(() =>
      youtube.comments.list({
        part: 'snippet,replies',
        id: commentId,
        textFormat: 'plainText',
      }),
    )

    if (!response.data.items || !response.data.items[0]) {
      throw new Error('Comment not found')
    }

    const comment = response.data.items[0].snippet

    return {
      id: commentId,
      authorName: comment.authorDisplayName,
      authorId: comment.authorChannelId?.value,
      text: comment.textDisplay,
      likes: comment.likeCount,
      publishedAt: comment.publishedAt,
      videoId: comment.videoId,
      parentId: comment.parentId,
    }
  } catch (error) {
    logger.error('Failed to get comment details', error)
    throw error
  }
}

/**
 * Reply to a comment
 * @param {string} commentId - Comment ID to reply to
 * @param {string} text - Reply text (max 10,000 chars)
 * @returns {Promise<Object>} Reply result {replyId, text}
 */
async function replyToComment(commentId, text) {
  if (!text || text.length === 0) {
    throw new Error('Reply text cannot be empty')
  }

  if (text.length > 10000) {
    throw new Error('Reply text exceeds 10,000 character limit')
  }

  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Replying to comment: ${commentId}`)

    const response = await makeQuotaAwareRequest(() =>
      youtube.comments.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            textOriginal: text,
            parentId: commentId,
          },
        },
      }),
    )

    const reply = response.data.snippet
    logger.info(`Reply sent: ${response.data.id}`)

    return {
      replyId: response.data.id,
      text: reply.textDisplay,
      authorName: reply.authorDisplayName,
      publishedAt: reply.publishedAt,
    }
  } catch (error) {
    logger.error('Failed to reply to comment', error)
    throw error
  }
}

/**
 * Mark comment as spam
 * @param {string} commentId - Comment ID
 */
async function markAsSpam(commentId) {
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Marking comment as spam: ${commentId}`)

    await makeQuotaAwareRequest(() =>
      youtube.comments.markAsSpam({
        id: commentId,
      }),
    )

    logger.info('Comment marked as spam')
  } catch (error) {
    logger.error('Failed to mark comment as spam', error)
    throw error
  }
}

/**
 * Delete a comment (must be owner/channel)
 * @param {string} commentId - Comment ID
 */
async function deleteComment(commentId) {
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Deleting comment: ${commentId}`)

    await makeQuotaAwareRequest(() =>
      youtube.comments.delete({
        id: commentId,
      }),
    )

    logger.info('Comment deleted')
  } catch (error) {
    logger.error('Failed to delete comment', error)
    throw error
  }
}

/**
 * Get comment statistics for a video
 * @param {string} videoId - Video ID
 * @returns {Promise<Object>} Comment stats
 */
async function getCommentStats(videoId) {
  const youtube = await getAuthenticatedClient()

  try {
    logger.info(`Getting comment stats for video: ${videoId}`)

    let totalComments = 0
    let totalReplies = 0
    let pageToken = null

    do {
      const response = await makeQuotaAwareRequest(() =>
        youtube.commentThreads.list({
          part: 'snippet',
          videoId,
          maxResults: 20,
          pageToken,
          textFormat: 'plainText',
        }),
      )

      response.data.items?.forEach((thread) => {
        totalComments++
        totalReplies += thread.snippet.replyCount
      })

      pageToken = response.data.nextPageToken
    } while (pageToken)

    return {
      videoId,
      totalComments,
      totalReplies,
      totalEngagement: totalComments + totalReplies,
    }
  } catch (error) {
    logger.error('Failed to get comment stats', error)
    return {
      videoId,
      totalComments: 0,
      totalReplies: 0,
      totalEngagement: 0,
    }
  }
}

/**
 * Get sentiment analysis of comments (basic)
 * @param {Array} comments - Comments array
 * @returns {Object} Sentiment breakdown
 */
function analyzeCommentSentiment(comments) {
  const sentiment = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: comments.length,
  }

  const positiveKeywords = [
    'love',
    'great',
    'awesome',
    'excellent',
    'thanks',
    'grateful',
    'amazing',
    'wonderful',
  ]
  const negativeKeywords = ['hate', 'bad', 'terrible', 'awful', 'dislike', 'worst', 'horrible']

  comments.forEach((comment) => {
    const text = comment.text.toLowerCase()
    const hasPositive = positiveKeywords.some((kw) => text.includes(kw))
    const hasNegative = negativeKeywords.some((kw) => text.includes(kw))

    if (hasPositive) {
      sentiment.positive++
    } else if (hasNegative) {
      sentiment.negative++
    } else {
      sentiment.neutral++
    }
  })

  return sentiment
}

module.exports = {
  listComments,
  getCommentDetails,
  replyToComment,
  markAsSpam,
  deleteComment,
  getCommentStats,
  analyzeCommentSentiment,
}
