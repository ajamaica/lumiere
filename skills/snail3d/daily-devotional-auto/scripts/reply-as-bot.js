#!/usr/bin/env node

/**
 * Reply to YouTube comments as Snail's Bot
 * Conservative Lutheran theology (5 Solas)
 * Selective reply logic - not every comment needs a response
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const CREDENTIALS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
const TOKENS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')
const DOCTRINAL_ALERTS_FILE = path.join(
  process.env.HOME,
  '.clawd-devotional',
  'temp',
  'doctrinal-alerts.json',
)
const REPLY_HISTORY_FILE = path.join(
  process.env.HOME,
  '.clawd-devotional',
  'temp',
  'reply-history.json',
)

// Snail's info for context-aware replies
const SNAIL = {
  github: 'https://github.com/Snail3D',
  makerworld: 'https://makerworld.com/en/u/[username]', // Update with actual username
  youtubeChannel: '@Snail3D',
  discord:
    "Check the channel description for my Discord link - that's the best way to reach me directly!",
  interests: [
    '3D printing',
    'Bambu Lab',
    'automation',
    'faith',
    'Lutheran theology',
    'coding',
    'OpenClaw',
  ],
  repos: [
    'youtube-studio',
    'daily-devotional-auto',
    'twilio-skill',
    'skill-defender',
    'universal-voice-agent',
    'ClawDoro',
  ],
}

// Snail's theological framework (5 Solas)
const THEOLOGY = {
  denomination: 'Conservative Lutheran',
  beliefs: [
    'Sola Scriptura (Scripture alone)',
    'Sola Gratia (Grace alone)',
    'Sola Fide (Faith alone)',
    'Solus Christus (Christ alone)',
    'Soli Deo Gloria (Glory to God alone)',
  ],
  keyPoints: {
    salvation: 'Saved by grace through faith, not by works (Ephesians 2:8-9)',
    authority: 'The Bible is the inspired, inerrant Word of God',
    christ: 'Jesus Christ is the only way to salvation (John 14:6)',
    sacraments: "Baptism and the Lord's Supper are means of grace",
  },
}

// Keywords that indicate a comment warrants a reply
const HIGH_VALUE_KEYWORDS = [
  'question',
  'how do you',
  'how did you',
  'what is',
  'explain',
  'confused',
  'help',
  'stuck',
  'error',
  'bug',
  'issue',
  'github',
  'repo',
  'source',
  'code',
  'script',
  'makerworld',
  '3d print',
  'stl',
  'model',
  'bambu',
  'suggestion',
  'feature',
  'request',
  'idea',
  'thank',
  'grateful',
  'blessed',
  'encouraged',
  'helped',
  'contact',
  'reach you',
  'get in touch',
  'message',
  'discord',
  'email',
]

// Keywords that indicate we should NOT reply (low value)
const SKIP_KEYWORDS = [
  'lol',
  'haha',
  'nice',
  'cool',
  'good job',
  '👍',
  '❤️',
  'first',
  'early',
  'notification',
  'subs',
  'subscribe',
]

// Check if we've already replied to this comment/thread
function hasReplied(commentId) {
  try {
    if (fs.existsSync(REPLY_HISTORY_FILE)) {
      const history = JSON.parse(fs.readFileSync(REPLY_HISTORY_FILE, 'utf8'))
      return history.some((h) => h.commentId === commentId || h.threadId === commentId)
    }
  } catch (e) {}
  return false
}

// Save reply to history
function saveReply(commentId, threadId, videoId) {
  let history = []
  try {
    if (fs.existsSync(REPLY_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(REPLY_HISTORY_FILE, 'utf8'))
    }
  } catch (e) {}

  history.push({
    commentId,
    threadId,
    videoId,
    timestamp: new Date().toISOString(),
  })

  // Keep only last 1000 replies
  if (history.length > 1000) {
    history = history.slice(-1000)
  }

  fs.writeFileSync(REPLY_HISTORY_FILE, JSON.stringify(history, null, 2))
}

// Get Snail's GitHub repos for reference
function getGitHubRepos() {
  return SNAIL.repos.map((r) => `https://github.com/Snail3D/${r}`)
}

// Check if comment mentions MakerWorld or 3D printing
function isMakerWorldRelated(text) {
  const keywords = ['makerworld', '3d print', 'stl', 'bambu', 'model', 'filament', 'slicer']
  return keywords.some((k) => text.toLowerCase().includes(k))
}

// Check if comment mentions GitHub or code
function isGitHubRelated(text) {
  const keywords = ['github', 'repo', 'source', 'code', 'script', 'automation', 'openclaw']
  return keywords.some((k) => text.toLowerCase().includes(k))
}

// Check if comment has a question
function hasQuestion(text) {
  return (
    text.includes('?') ||
    /\b(how|what|why|when|where|who|which|can you|could you|would you)\b/i.test(text)
  )
}

// Check if it's a reply to one of our replies (for follow-up)
function isReplyToOurReply(comment, author) {
  // If the comment mentions us and has a question, likely a follow-up
  return (
    (comment.toLowerCase().includes('snail') || comment.toLowerCase().includes('bot')) &&
    hasQuestion(comment)
  )
}

// Calculate reply priority score (0-100)
function calculatePriority(alert) {
  const text = alert.comment.toLowerCase()
  let score = 50 // Base score

  // Boost for questions
  if (hasQuestion(alert.comment)) score += 20

  // Boost for high-value keywords
  HIGH_VALUE_KEYWORDS.forEach((kw) => {
    if (text.includes(kw)) score += 10
  })

  // Boost for MakerWorld/GitHub topics (Snail's expertise)
  if (isMakerWorldRelated(text)) score += 15
  if (isGitHubRelated(text)) score += 15

  // Boost for doctrinal questions (Snail wants to see these)
  if (alert.type === 'doctrinal_question') score += 25

  // Boost for replies to our replies (conversational)
  if (isReplyToOurReply(alert.comment, alert.author)) score += 20

  // Reduce for low-value comments
  SKIP_KEYWORDS.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) score -= 15
  })

  // Cap at 100
  return Math.min(100, Math.max(0, score))
}

// Reply templates
const REPLY_TEMPLATES = {
  makerworld: `Hi there! This is Snail's Bot 🤖

Great question about 3D printing! Snail is passionate about this stuff.

You can find his designs on MakerWorld - he's got some really cool models there. Check the video description for direct links to specific models mentioned.

Snail primarily uses Bambu Lab printers (A1 Mini and P1S) and loves sharing his process. If you have questions about slicer settings or specific prints, he'll definitely want to chime in personally!

💬 Want to reach Snail directly? Check the channel description for his Discord link!

- Snail's Bot`,

  github: `Hi there! This is Snail's Bot 🤖

Thanks for your interest in the code! Snail loves sharing his automation work.

You can find his repos at: https://github.com/Snail3D

Popular repos:
${SNAIL.repos
  .slice(0, 5)
  .map((r) => `• ${r}`)
  .join('\n')}

Everything is open source - feel free to fork, star, and contribute!

💬 Questions or want to collaborate? Check the channel description for Snail's Discord link!

- Snail's Bot`,

  githubDetailed: (repoName) => `Hi there! This is Snail's Bot 🤖

Snail's ${repoName} repo is available here:
https://github.com/Snail3D/${repoName}

The README has full setup instructions. If you run into issues, open a GitHub issue and Snail will help troubleshoot!

- Snail's Bot`,

  doctrinal: `Hi there! This is Snail's Bot 🤖

Your question touches on some important theological matters. Snail holds to the 5 Solas of the Reformation:
• Scripture alone
• Grace alone  
• Faith alone
• Christ alone
• Glory to God alone

From his Lutheran perspective: [ANSWER]

For a more detailed response, Snail will review this question personally.

💬 Want to discuss this further? Check the channel description for Snail's Discord link - that's the best way to reach him directly!

Thanks for engaging with the content!

- Snail's Bot`,

  error: `Hi there! This is Snail's Bot 🤖

Thank you for pointing out a potential error! You're absolutely right to be discerning about theological content, especially when it's AI-generated.

Snail takes doctrinal accuracy seriously and will review this. Please know:
• This devotional is AI-generated and not a substitute for pastoral guidance
• The goal is encouragement, not theological training
• Human review is always needed

Snail will look into this. Thanks for keeping us accountable!

- Snail's Bot`,

  suggestion: `Hi there! This is Snail's Bot 🤖

Thank you for your suggestion! I've logged your topic idea for future consideration.

Snail reviews all suggestions and may feature community-requested topics in upcoming devotionals. Stay tuned!

- Snail's Bot`,

  encouragement: `Hi there! This is Snail's Bot 🤖

Thank you for your kind words! Snail is glad the devotional was an encouragement to you.

Remember: This is AI-generated content meant to point you to Scripture. For pastoral care and deeper theological guidance, please connect with your local church.

God bless!

- Snail's Bot`,

  followUp: `Hi there! Snail's Bot again 🤖

Thanks for the follow-up! Let me get Snail's input on this since it's a great question.

[RESPONSE]

💬 For a faster response, check the channel description for Snail's Discord link - that's the best way to reach him directly!

If you have more questions, keep them coming!

- Snail's Bot`,

  contact: `Hi there! This is Snail's Bot 🤖

Thanks for wanting to connect!

The best way to reach Snail directly is through Discord. Check the channel description for the invite link - that's where he's most active and can respond to questions, collaboration ideas, or just chat about 3D printing, coding, automation, or theology!

Looking forward to seeing you there!

- Snail's Bot`,

  general: `Hi there! This is Snail's Bot 🤖

Thanks for your comment! Snail asked me to help respond to questions while he's away. I do my best to represent his conservative Lutheran perspective, but for deep theological questions, he'll want to respond personally.

- Snail's Bot`,
}

async function replyToComments() {
  console.log('💬 Checking for comments to reply to...\n')

  // Load doctrinal alerts
  let alerts = []
  try {
    if (fs.existsSync(DOCTRINAL_ALERTS_FILE)) {
      alerts = JSON.parse(fs.readFileSync(DOCTRINAL_ALERTS_FILE, 'utf8'))
    }
  } catch (error) {
    console.warn('Could not load alerts:', error.message)
  }

  // Filter for unreviewed, unreplied alerts
  let pendingAlerts = alerts.filter((a) => !a.reviewed && !a.replied && !hasReplied(a.commentId))

  if (pendingAlerts.length === 0) {
    console.log('✅ No pending comments to reply to')
    return
  }

  console.log(`Found ${pendingAlerts.length} new comments\n`)

  // Calculate priority for each
  const scoredAlerts = pendingAlerts.map((alert) => ({
    ...alert,
    priority: calculatePriority(alert),
    shouldReply: false, // Will determine based on threshold
  }))

  // Sort by priority (highest first)
  scoredAlerts.sort((a, b) => b.priority - a.priority)

  // Select top 50% to reply to (max 10 per run)
  const replyThreshold = 50
  const maxReplies = 10
  let replyCount = 0

  for (const alert of scoredAlerts) {
    if (alert.priority >= replyThreshold && replyCount < maxReplies) {
      alert.shouldReply = true
      replyCount++
    }
  }

  console.log(`Selected ${replyCount} comments to reply to (priority ≥ ${replyThreshold})\n`)
  console.log('='.repeat(60))

  // Generate replies for selected comments
  for (const alert of scoredAlerts) {
    console.log(`\n👤 ${alert.author} (Priority: ${alert.priority}/100)`)
    console.log(`💬 "${alert.comment.substring(0, 80)}..."`)
    console.log(`📹 ${alert.videoTitle}`)

    if (alert.shouldReply) {
      const reply = generateReply(alert)
      console.log(`\n🤖 Suggested Reply:`)
      console.log('-'.repeat(40))
      console.log(reply)
      console.log('-'.repeat(40))

      // Mark for approval
      alert.suggestedReply = reply
      alert.needsApproval = true
      alert.flaggedForReply = true
    } else {
      console.log(`⏭️  Skipped (priority too low)`)
      alert.skipped = true
    }
  }

  // Update alerts file
  const updatedAlerts = alerts.map((a) => {
    const scored = scoredAlerts.find((s) => s.commentId === a.commentId)
    return scored || a
  })

  saveAlerts(updatedAlerts)

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`  • Total comments checked: ${pendingAlerts.length}`)
  console.log(`  • Selected for reply: ${replyCount}`)
  console.log(`  • Skipped (low priority): ${pendingAlerts.length - replyCount}`)
  console.log(`\n⚠️  Replies need Snail's approval before posting`)
  console.log(`📁 Review at: ${DOCTRINAL_ALERTS_FILE}`)
}

function generateReply(alert) {
  const text = alert.comment.toLowerCase()
  const isFollowUp = isReplyToOurReply(alert.comment, alert.author)

  // MakerWorld / 3D printing questions
  if (isMakerWorldRelated(text)) {
    return REPLY_TEMPLATES.makerworld
  }

  // GitHub / code questions
  if (isGitHubRelated(text)) {
    // Check if they mentioned a specific repo
    for (const repo of SNAIL.repos) {
      if (text.includes(repo.toLowerCase())) {
        return REPLY_TEMPLATES.githubDetailed(repo)
      }
    }
    return REPLY_TEMPLATES.github
  }

  // Error reports
  if (
    text.includes('error') ||
    text.includes('wrong') ||
    text.includes('incorrect') ||
    text.includes('mistake')
  ) {
    return REPLY_TEMPLATES.error
  }

  // Doctrinal questions
  if (
    alert.type === 'doctrinal_question' ||
    THEOLOGY.beliefs.some((b) => text.includes(b.toLowerCase()))
  ) {
    return generateDoctrinalReply(alert.comment)
  }

  // Contact / reach out requests
  if (
    text.includes('discord') ||
    text.includes('contact') ||
    text.includes('reach you') ||
    text.includes('get in touch') ||
    text.includes('message you') ||
    text.includes('email')
  ) {
    return REPLY_TEMPLATES.contact
  }

  // Suggestions
  if (
    text.includes('suggest') ||
    text.includes('topic') ||
    text.includes('request') ||
    text.includes('idea')
  ) {
    return REPLY_TEMPLATES.suggestion
  }

  // Encouragement / thanks
  if (
    text.includes('thank') ||
    text.includes('grateful') ||
    text.includes('love') ||
    text.includes('blessed') ||
    text.includes('encouraged')
  ) {
    return REPLY_TEMPLATES.encouragement
  }

  // Follow-up to our reply
  if (isFollowUp) {
    return REPLY_TEMPLATES.followUp.replace(
      '[RESPONSE]',
      "He's currently away from his desk, but I've noted your question and he'll respond when he's back!",
    )
  }

  // Default
  return REPLY_TEMPLATES.general
}

function generateDoctrinalReply(comment) {
  const text = comment.toLowerCase()
  let answer = ''

  if (text.includes('grace') && text.includes('works')) {
    answer = `We are saved by grace through faith, not by works (Ephesians 2:8-9). Good works are the fruit of faith, not the cause of salvation.`
  } else if (text.includes('bible') || text.includes('scripture')) {
    answer = `The Bible is the inspired, inerrant Word of God and our ultimate authority (2 Timothy 3:16). Scripture interprets Scripture.`
  } else if (text.includes('jesus') || text.includes('christ')) {
    answer = `Jesus Christ is the only way to salvation (John 14:6). He is true God and true man, and His sacrifice on the cross is sufficient for all who believe.`
  } else if (text.includes('faith') && text.includes('alone')) {
    answer = `We are justified by faith alone (Romans 3:28). Faith is the instrument that receives the gift of salvation that Christ earned for us.`
  } else if (text.includes('sabbath')) {
    answer = `The Sabbath was made for man, not man for the Sabbath (Mark 2:27). We find rest in Christ, who is our ultimate Sabbath.`
  } else if (text.includes('baptism')) {
    answer = `Baptism is a means of grace where God connects us to Christ's death and resurrection (Romans 6:3-4). It's His work, not ours.`
  } else if (
    text.includes('communion') ||
    text.includes('eucharist') ||
    text.includes("lord's supper")
  ) {
    answer = `In the Lord's Supper, we receive Christ's true body and blood for the forgiveness of sins (Matthew 26:26-28). It's a gift of grace.`
  } else {
    answer = `This is a great question that deserves careful consideration in light of Scripture. The Lutheran Confessions guide our understanding, always pointing us back to God's Word as our sole authority.`
  }

  return REPLY_TEMPLATES.doctrinal.replace('[ANSWER]', answer)
}

function saveAlerts(alerts) {
  fs.writeFileSync(DOCTRINAL_ALERTS_FILE, JSON.stringify(alerts, null, 2))
}

// Run if called directly
if (require.main === module) {
  replyToComments().catch(console.error)
}

module.exports = { replyToComments, calculatePriority, THEOLOGY, SNAIL }
