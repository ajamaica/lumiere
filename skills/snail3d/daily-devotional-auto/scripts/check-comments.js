#!/usr/bin/env node

/**
 * Check YouTube comments for user suggestions
 * Run this as part of the daily workflow to gather topic ideas
 */

const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

const CREDENTIALS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
const TOKENS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')
const SUGGESTIONS_FILE = path.join(
  process.env.HOME,
  '.clawd-devotional',
  'temp',
  'user-suggestions.json',
)

// Keywords that indicate a suggestion
const SUGGESTION_KEYWORDS = [
  'suggest',
  'topic',
  'idea',
  'please do',
  'can you do',
  'would love to see',
  'pray for',
  'devotional about',
  'topic about',
  'cover',
  'request',
  'question about',
  'wondering about',
  'help with',
  'struggling with',
]

// Keywords that indicate doctrinal questions (for Snail's attention)
const DOCTRINAL_KEYWORDS = [
  'doctrine',
  'theology',
  'interpretation',
  'meaning of',
  'explain',
  'why does the bible say',
  'confused about',
  'disagree',
  'wrong',
  'heresy',
  'false teaching',
  'catholic',
  'protestant',
  'lutheran',
  'reformed',
  'baptist',
  'presbyterian',
  'methodist',
  'denomination',
  'salvation',
  'grace',
  'faith alone',
  'works',
  'sola',
  'scripture alone',
  'communion',
  'eucharist',
  "lord's supper",
  'baptism',
  'sacrament',
  'predestination',
  'election',
  'free will',
  'original sin',
  'justification',
  'sanctification',
  'rapture',
  'millennium',
  'tribulation',
  'eschatology',
  'trinity',
  'deity of christ',
  'holy spirit',
  'gifts of the spirit',
  'speaking in tongues',
  'healing',
  'prosperity gospel',
  'word of faith',
]

const DOCTRINAL_ALERTS_FILE = path.join(
  process.env.HOME,
  '.clawd-devotional',
  'temp',
  'doctrinal-alerts.json',
)

async function checkCommentsForSuggestions() {
  console.log('🔍 Checking YouTube comments for user suggestions...\n')

  // Load credentials
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'))
  const { client_id, client_secret } = credentials.installed

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8888')

  oauth2Client.setCredentials(tokens)

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  // Get recent videos from your channel
  try {
    // Search for recent videos
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      forMine: true,
      type: 'video',
      maxResults: 10,
      order: 'date',
    })

    const videos = searchResponse.data.items || []
    console.log(`Found ${videos.length} recent videos\n`)

    const suggestions = []
    const doctrinalAlerts = []
    const existingSuggestions = loadExistingSuggestions()
    const existingAlerts = loadExistingAlerts()

    for (const video of videos) {
      const videoId = video.id.videoId
      const videoTitle = video.snippet.title

      console.log(`Checking: "${videoTitle}"`)

      // Get comments for this video
      try {
        const commentsResponse = await youtube.commentThreads.list({
          part: 'snippet',
          videoId: videoId,
          maxResults: 50,
          order: 'time', // Most recent first
        })

        const comments = commentsResponse.data.items || []

        for (const thread of comments) {
          const comment = thread.snippet.topLevelComment.snippet
          const text = comment.textDisplay.toLowerCase()
          const author = comment.authorDisplayName

          // Check if comment contains suggestion keywords
          const isSuggestion = SUGGESTION_KEYWORDS.some((keyword) =>
            text.includes(keyword.toLowerCase()),
          )

          // Check if comment contains doctrinal keywords (for Snail's attention)
          const isDoctrinal = DOCTRINAL_KEYWORDS.some((keyword) =>
            text.includes(keyword.toLowerCase()),
          )

          if (isSuggestion) {
            // Extract the topic (simplified - just use the comment text)
            const topic = extractTopic(comment.textDisplay)

            if (topic && !isDuplicate(topic, existingSuggestions)) {
              suggestions.push({
                topic,
                comment: comment.textDisplay,
                author,
                videoId,
                videoTitle,
                timestamp: new Date().toISOString(),
                used: false,
              })

              console.log(`  💡 Suggestion from ${author}: "${topic.substring(0, 60)}..."`)
            }
          }

          if (isDoctrinal) {
            // Flag doctrinal questions for Snail's attention
            const alert = {
              type: 'doctrinal_question',
              comment: comment.textDisplay,
              author,
              videoId,
              videoTitle,
              commentId: thread.id,
              timestamp: new Date().toISOString(),
              reviewed: false,
            }

            if (!isDuplicateAlert(alert, existingAlerts)) {
              doctrinalAlerts.push(alert)
              console.log(
                `  ⚠️  DOCTRINAL ALERT from ${author}: "${comment.textDisplay.substring(0, 50)}..."`,
              )
            }
          }
        }
      } catch (error) {
        console.warn(`  Could not fetch comments: ${error.message}`)
      }
    }

    // Save suggestions
    if (suggestions.length > 0) {
      const allSuggestions = [...existingSuggestions, ...suggestions]
      saveSuggestions(allSuggestions)
      console.log(`\n✅ Found ${suggestions.length} new suggestions`)
      console.log(`📁 Total suggestions: ${allSuggestions.filter((s) => !s.used).length} unused`)
    } else {
      console.log('\n✅ No new suggestions found')
    }

    // Save doctrinal alerts
    if (doctrinalAlerts.length > 0) {
      const allAlerts = [...existingAlerts, ...doctrinalAlerts]
      saveAlerts(allAlerts)
      console.log(`\n🚨 Found ${doctrinalAlerts.length} doctrinal questions for Snail's attention`)
      console.log(`📁 Total unreviewed alerts: ${allAlerts.filter((a) => !a.reviewed).length}`)
    }
  } catch (error) {
    console.error('❌ Error checking comments:', error.message)
  }
}

function extractTopic(commentText) {
  // Simple extraction - could be improved with NLP
  // Remove URLs, mentions, and hashtags
  let topic = commentText
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/#\w+/g, '')
    .replace(/[^a-zA-Z0-9\s.,;:!?'-]/g, '')
    .trim()

  // Limit length
  if (topic.length > 100) {
    topic = topic.substring(0, 100) + '...'
  }

  return topic || null
}

function isDuplicate(topic, existing) {
  return existing.some(
    (s) =>
      s.topic.toLowerCase() === topic.toLowerCase() ||
      s.topic.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(s.topic.toLowerCase()),
  )
}

function loadExistingSuggestions() {
  try {
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, 'utf8'))
    }
  } catch (error) {
    console.warn('Could not load existing suggestions:', error.message)
  }
  return []
}

function saveSuggestions(suggestions) {
  const dir = path.dirname(SUGGESTIONS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2))
}

function loadExistingAlerts() {
  try {
    if (fs.existsSync(DOCTRINAL_ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(DOCTRINAL_ALERTS_FILE, 'utf8'))
    }
  } catch (error) {
    console.warn('Could not load existing alerts:', error.message)
  }
  return []
}

function saveAlerts(alerts) {
  const dir = path.dirname(DOCTRINAL_ALERTS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DOCTRINAL_ALERTS_FILE, JSON.stringify(alerts, null, 2))
}

function isDuplicateAlert(alert, existing) {
  return existing.some(
    (a) =>
      a.commentId === alert.commentId ||
      (a.comment && alert.comment && a.comment.toLowerCase() === alert.comment.toLowerCase()),
  )
}

// Run if called directly
if (require.main === module) {
  checkCommentsForSuggestions().catch(console.error)
}

module.exports = { checkCommentsForSuggestions, loadExistingAlerts }
