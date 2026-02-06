#!/usr/bin/env node

/**
 * Daily Devotional Automation System - National/International News Edition
 * Runs every day at 9:00 AM MST
 *
 * This script:
 * 1. Fetches national/international news
 * 2. Generates a contextual devotional
 * 3. Creates TTS audio
 * 4. Renders video with visualizer and prominent title
 * 5. Uploads to YouTube
 * 6. Cleans up local files
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { generateThumbnail } = require('./thumbnail-generator')

// Configuration
const CONFIG = {
  timezone: 'America/Denver',
  uploadTime: '09:00',
  outputDir: path.join(process.env.HOME, 'Desktop', 'devotionals'),
  tempDir: path.join(process.env.HOME, '.clawd-devotional', 'temp'),
  newsApiKey: process.env.NEWS_API_KEY,
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
  aiApiKey: process.env.AI_API_KEY,
}

// Ensure directories exist
;[CONFIG.outputDir, CONFIG.tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

/**
 * Main automation workflow
 */
async function runDailyDevotional() {
  const timestamp = new Date().toISOString()
  console.log(`🌅 Starting Daily Devotional Automation - ${timestamp}`)

  try {
    // Step 1: Check for user-suggested topics from comments
    console.log('💬 Checking user suggestions...')
    const userSuggestedTopics = await checkUserSuggestedTopics()

    // Step 2: Fetch national/international news (if no user suggestions)
    console.log('📰 Fetching news...')
    const newsContext = await fetchWorldNews()

    // Step 3: Generate devotional (prioritizing user suggestions)
    console.log('✍️ Generating devotional...')
    const devotional = await generateDevotional(newsContext, userSuggestedTopics)

    // Step 3: Generate thumbnail
    console.log('🎨 Generating thumbnail...')
    const thumbnailResult = await generateThumbnail(devotional, { resolution: '1K' })
    const thumbnailPath = thumbnailResult ? thumbnailResult.baseImage : null

    // Step 4: Create TTS audio
    console.log('🎙️ Creating audio...')
    const audioPath = await createTTS(devotional)

    // Step 5: Render video with thumbnail as background
    console.log('🎬 Rendering video...')
    const videoPath = await renderVideoWithTitle(audioPath, devotional, thumbnailPath)

    // Step 6: Upload to YouTube (with thumbnail if generated)
    console.log('📤 Uploading to YouTube...')
    const uploadResult = await uploadToYouTube(videoPath, devotional, thumbnailPath)

    // Step 7: Clean up
    console.log('🧹 Cleaning up...')
    cleanup(videoPath, audioPath, thumbnailPath)

    console.log('✅ Daily devotional complete!')
    console.log(`📺 YouTube URL: https://youtube.com/watch?v=${uploadResult.videoId}`)

    return {
      success: true,
      videoId: uploadResult.videoId,
      devotional,
    }
  } catch (error) {
    console.error('❌ Devotional automation failed:', error)
    throw error
  }
}

/**
 * Fetch national/international news
 */
async function fetchWorldNews() {
  const sources = [fetchFromNewsAPI, fetchFallbackNews]

  for (const fetchFn of sources) {
    try {
      const news = await fetchFn()
      if (news && news.stories && news.stories.length > 0) {
        return news
      }
    } catch (e) {
      console.warn(`News source failed: ${fetchFn.name}`)
    }
  }

  return { theme: 'daily_faith', stories: [] }
}

async function fetchFromNewsAPI() {
  if (!CONFIG.newsApiKey) throw new Error('No API key')

  const today = new Date().toISOString().split('T')[0]

  const response = await axios.get('https://newsapi.org/v2/top-headlines', {
    params: {
      country: 'us',
      from: today,
      sortBy: 'publishedAt',
      apiKey: CONFIG.newsApiKey,
    },
  })

  return categorizeWorldNews(response.data.articles)
}

async function fetchFallbackNews() {
  // Fallback to general themes if API fails
  return {
    theme: 'daily_faith',
    stories: [
      { title: 'Global events remind us to trust in God' },
      { title: 'World news highlights need for faith and compassion' },
    ],
  }
}

function categorizeWorldNews(articles) {
  const text = articles
    .map((a) => `${a.title} ${a.description || ''}`)
    .join(' ')
    .toLowerCase()

  if (
    text.includes('tragedy') ||
    text.includes('crash') ||
    text.includes('death') ||
    text.includes('attack') ||
    text.includes('war') ||
    text.includes('disaster')
  ) {
    return { theme: 'trust_in_uncertain_times', stories: articles.slice(0, 3) }
  }
  if (
    text.includes('help') ||
    text.includes('community') ||
    text.includes('donation') ||
    text.includes('charity') ||
    text.includes('volunteer')
  ) {
    return { theme: 'community_love', stories: articles.slice(0, 3) }
  }
  if (
    text.includes('weather') ||
    text.includes('storm') ||
    text.includes('flood') ||
    text.includes('hurricane') ||
    text.includes('earthquake')
  ) {
    return { theme: 'peace_in_storms', stories: articles.slice(0, 3) }
  }
  if (
    text.includes('health') ||
    text.includes('medical') ||
    text.includes('cure') ||
    text.includes('healing')
  ) {
    return { theme: 'hope_and_healing', stories: articles.slice(0, 3) }
  }
  if (
    text.includes('economy') ||
    text.includes('jobs') ||
    text.includes('financial') ||
    text.includes('money') ||
    text.includes('debt')
  ) {
    return { theme: 'trust_in_gods_provision', stories: articles.slice(0, 3) }
  }

  return { theme: 'daily_faith', stories: articles.slice(0, 3) }
}

/**
 * Generate devotional from news context (with user suggestions if available)
 */
async function generateDevotional(newsContext, userSuggestedTopics = []) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const themes = {
    trust_in_uncertain_times: {
      title: 'Finding Peace When the World Feels Uncertain',
      scripture: 'Psalm 46:1-3',
      scriptureText:
        'God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea.',
    },
    community_love: {
      title: 'Love Your Neighbor as Yourself',
      scripture: 'Matthew 22:39',
      scriptureText: 'Love your neighbor as yourself.',
    },
    peace_in_storms: {
      title: 'Peace in the Midst of the Storm',
      scripture: 'Mark 4:39',
      scriptureText:
        'He got up, rebuked the wind and said to the waves, "Quiet! Be still!" Then the wind died down and it was completely calm.',
    },
    hope_and_healing: {
      title: 'The God Who Heals',
      scripture: 'Jeremiah 30:17',
      scriptureText: 'But I will restore you to health and heal your wounds, declares the Lord.',
    },
    trust_in_gods_provision: {
      title: 'God Will Provide',
      scripture: 'Philippians 4:19',
      scriptureText:
        'And my God will meet all your needs according to the riches of his glory in Christ Jesus.',
    },
    daily_faith: {
      title: 'Walking by Faith Today',
      scripture: '2 Corinthians 5:7',
      scriptureText: 'For we walk by faith, not by sight.',
    },
  }

  // Check if we have a user-suggested topic that hasn't been done
  let theme
  let userSuggestionInfo = null

  if (userSuggestedTopics && userSuggestedTopics.length > 0) {
    // Use the first unused user suggestion (with full info)
    const selected = userSuggestedTopics[0]
    userSuggestionInfo = selected
    const customTopic = selected.topic
    console.log(`Using user-suggested topic from ${selected.author}: ${customTopic}`)

    // Create a custom theme based on user suggestion
    theme = {
      title: `${customTopic}`,
      scripture: 'Proverbs 3:5-6',
      scriptureText:
        'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    }

    // Mark this topic as used
    markTopicAsUsed(customTopic)
  } else {
    // Use news-based theme
    theme = themes[newsContext.theme] || themes.daily_faith
  }

  const intro = userSuggestionInfo
    ? `Today we're exploring a topic requested by our community member ${userSuggestionInfo.author}. They asked about: ${userSuggestionInfo.topic}. This is a subject that many of you have asked about, and I'm excited to dive into what God's Word says about it.`
    : generateIntro(newsContext)

  const devotional = {
    date: dateStr,
    title: theme.title,
    scripture: theme.scripture,
    scriptureText: theme.scriptureText,
    intro,
    body: generateBody(theme, newsContext),
    reflection: generateReflection(theme),
    prayer: generatePrayer(theme),
  }

  devotional.fullText = formatFullText(devotional)
  devotional.description = formatDescription(devotional)
  devotional.userSuggestionInfo = userSuggestionInfo // Pass through for video display

  return devotional
}

function generateIntro(newsContext) {
  const intros = {
    trust_in_uncertain_times:
      "Today's headlines remind us that we live in an uncertain world. Tragedies happen, circumstances shift, and the unexpected becomes reality. In moments like these, we're confronted with how little control we truly have.",
    community_love:
      "In today's news, we see stories of people helping one another, communities coming together, and ordinary individuals doing extraordinary things for their neighbors. These moments reflect something deep and true about who we're called to be.",
    peace_in_storms:
      "From natural disasters to personal crises, storms come in many forms. Today's news carries stories of people facing overwhelming circumstances, and we're reminded that life can change in an instant.",
    hope_and_healing:
      "Today's stories highlight our shared human experience of pain, sickness, and the longing for healing. Whether it's medical breakthroughs or personal battles, we're reminded of our fragility and our hope.",
    trust_in_gods_provision:
      "Economic uncertainty, financial pressures, and the daily worries about making ends meet fill many of today's headlines. These concerns are real, and they weigh heavily on countless families.",
    daily_faith:
      "Each new day brings fresh opportunities and challenges. As we look at today's news and consider our own circumstances, we're reminded that faith isn't just for the dramatic moments—it's for every moment.",
  }

  return intros[newsContext.theme] || intros.daily_faith
}

function generateBody(theme, newsContext) {
  const bodies = {
    trust_in_uncertain_times: `Life can change in an instant. The headlines shift, circumstances turn, and we're reminded that we are not in control—and that can be terrifying. But Scripture offers us a different perspective. The psalmist declares that even if the mountains fall into the sea, we need not fear. Why? Because God is not only our refuge—He is our strength. He is not distant—He is ever-present. When we face the fragility of life and the uncertainty of our times, we have a choice: we can let fear consume us, or we can let faith ground us. Today, choose faith. Choose to trust that even when the world feels unstable, God remains our unshakable foundation.`,
    community_love: `Jesus summarized the entire law in two commands: love God, and love your neighbor. The second is like the first—showing that our love for God is demonstrated through our love for others. When we serve those around us, we're not just doing good deeds; we're worshipping God. Every meal shared, every hand extended, every burden lifted becomes an act of devotion. In a world that often feels divided, love is our most powerful testimony.`,
    peace_in_storms: `The disciples were terrified when the storm hit their boat. Waves were crashing, wind was howling, and their situation seemed hopeless. But Jesus was in the boat with them—the same Jesus who is with you in your storm. He speaks peace to the chaos. He calms the raging seas. And He does the same in our lives when we invite Him into our storms. Whatever you're facing today, remember: the One who calms the storm is with you in it.`,
    hope_and_healing: `Sickness and suffering are part of our human experience, but they are not the end of our story. God promises healing—sometimes in this life, always in the next. He is the Great Physician who sees our pain, knows our struggle, and walks with us through the valley. Today, bring your hurts to Him. Bring your fears about the future. And receive the promise that He is working all things—including your healing—for good.`,
    trust_in_gods_provision: `Jesus taught us not to worry about what we will eat or drink or wear, pointing to the birds of the air and the flowers of the field as evidence of God's faithful provision. If He cares for them, how much more does He care for you? Your Father knows what you need before you ask Him. This doesn't mean we shouldn't work or plan wisely, but it does mean we can release our anxiety and trust that God will provide what we truly need.`,
    daily_faith: `Walking by faith doesn't mean we have all the answers. It means we trust the One who does. It means taking the next step even when we can't see the full path. It means believing that God is working all things together for good, even when we can't see how. Today, take one step of faith. Trust God with one area you've been holding back. And remember that the same God who started a good work in you will carry it on to completion.`,
  }

  return bodies[newsContext.theme] || bodies.daily_faith
}

function generateReflection(theme) {
  const reflections = {
    trust_in_uncertain_times:
      'What area of your life or the world feels uncertain right now? How can you invite God to be your refuge in that space?',
    community_love:
      "Who in your life needs to experience God's love through you today? What specific action can you take?",
    peace_in_storms:
      'What storm are you facing right now? What would it look like to invite Jesus to speak peace into that situation?',
    hope_and_healing:
      'Where do you need healing—physical, emotional, or spiritual? How can you bring that need to God today?',
    trust_in_gods_provision:
      'What financial concern or practical need is weighing on you? How can you trust God with that worry today?',
    daily_faith: "Where is God calling you to take a step of faith today? What's holding you back?",
  }

  return (
    reflections[
      Object.keys(reflections).find((k) => theme.title.toLowerCase().includes(k.split('_')[0]))
    ] || 'How is God speaking to you through His Word today?'
  )
}

function generatePrayer(theme) {
  const prayers = {
    trust_in_uncertain_times:
      "Lord, when the world feels fragile and uncertain, remind me that You are my unshakable foundation. Be with those hurting in our world today. Help me trust in Your presence and be Your hands of comfort to others. In Jesus' name, Amen.",
    community_love:
      "Lord, open my eyes to see my neighbors as You see them. Use me to be Your hands and feet in this world today. Give me opportunities to love practically and generously. In Jesus' name, Amen.",
    peace_in_storms:
      "Lord, speak 'Peace, be still' to the storms in my life. Help me remember that You are in the boat with me. I trust You. In Jesus' name, Amen.",
    hope_and_healing:
      "Lord, I bring my hurts and my hopes to You. Heal what is broken in me and in our world. Give me hope when I feel hopeless. In Jesus' name, Amen.",
    trust_in_gods_provision:
      "Lord, I release my worries about money and provision into Your hands. Help me trust that You will provide what I need. Teach me to be content and generous. In Jesus' name, Amen.",
    daily_faith:
      "Lord, give me the courage to walk by faith today, trusting Your lead even when I cannot see the full path. Strengthen my faith. In Jesus' name, Amen.",
  }

  return (
    prayers[
      Object.keys(prayers).find((k) => theme.title.toLowerCase().includes(k.split('_')[0]))
    ] ||
    "Lord, speak to me today through Your Word. Help me hear Your voice and follow Your leading. In Jesus' name, Amen."
  )
}

function formatFullText(devotional) {
  return `${devotional.title}\n\n${devotional.scripture}\n"${devotional.scriptureText}"\n\n${devotional.intro}\n\n${devotional.body}\n\nReflection Question: ${devotional.reflection}\n\nPrayer: ${devotional.prayer}`
}

function formatTextForSpeech(devotional) {
  // Format text with short natural pauses for ElevenLabs TTS
  // Using shorter break times to avoid hangs
  return `${devotional.title}. <break time="0.8s"/>

${devotional.scripture}. <break time="0.5s"/> ${devotional.scriptureText} <break time="1s"/>

${devotional.intro} <break time="0.8s"/>

${devotional.body} <break time="1s"/>

${devotional.reflection} <break time="1.5s"/>

${devotional.prayer}`
}

function formatDescription(devotional) {
  return `${devotional.intro}\n\n${devotional.body}\n\n🤔 Reflection Question:\n${devotional.reflection}\n\n🙏 Prayer:\n${devotional.prayer}\n\n---\n🌅 Daily Devotional for ${devotional.date}\n📖 Scripture: ${devotional.scripture}\n\n🤖 This devotional was generated 100% automatically by AI based on current news and/or viewer suggestions.\n\n💬 Have a topic you'd like us to cover? Leave a comment below with your suggestion! We read every comment and may feature your topic in a future devotional.\n\n---\n📝 A Note from Snail:\n\n"I know this is a little bit weird and freaky, but I'm trying to prove a point with this: automations can be used for Kingdom work and to inspire people to make their own things for Jesus and His glory. I'm not trying to replace any pastor or subvert their authority. Please keep in mind that this was written, composed, and even posted entirely by AI. So please post in the comments if you see any errors."\n\n💬 Want to reach me directly? Check the channel description for my Discord link - that's the best way to get in touch!\n\n---\n🔧 Interested in how this works?\n\nThis devotional is generated entirely by AI using OpenClaw. Want to create your own automated devotionals or see how it's built?\n\n⭐ GitHub Repo: https://github.com/Snail3D/daily-devotional-auto\n\nFeel free to fork, star, and adapt it for your own ministry or projects!\n\n📢 Subscribe for daily encouragement and biblical perspective on current events!`
}

/**
 * Create TTS audio using ElevenLabs with your custom voice
 */
async function createTTS(devotional) {
  const audioPath = path.join(CONFIG.tempDir, `devotional-${Date.now()}.mp3`)

  // Format text with natural pauses for better speech quality
  const ssmlText = formatTextForSpeech(devotional)

  // Use ElevenLabs API with your voice
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
  const VOICE_ID = 'eAfXdNE5aiS46rHwX5Mv' // Your preferred custom voice

  if (!ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not set. Using fallback TTS.')
    console.log(`Audio would be saved to: ${audioPath}`)
    return audioPath
  }

  try {
    console.log('🎙️ Generating natural audio with your ElevenLabs voice...')
    console.log('  - Added natural pauses between sections')
    console.log('  - Optimized voice settings for devotional speaking')

    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: ssmlText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.35, // Lower for more natural variation
          similarity_boost: 0.85, // Higher for better voice matching
          style: 0.3, // Slight style for devotional tone
          use_speaker_boost: true,
        },
      },
      responseType: 'arraybuffer',
    })

    fs.writeFileSync(audioPath, Buffer.from(response.data))
    console.log(`✅ Audio saved: ${audioPath}`)
    return audioPath
  } catch (error) {
    console.error('❌ ElevenLabs TTS failed:', error.message)
    console.log('Using fallback...')
    return audioPath
  }
}

/**
 * Render video with AI-generated thumbnail as background
 * Uses thumbnail image with audio visualizer overlay
 */
async function renderVideoWithTitle(audioPath, devotional, thumbnailPath = null) {
  const date = new Date().toISOString().split('T')[0]
  const videoPath = path.join(CONFIG.outputDir, `devotional-${date}.mp4`)

  let backgroundInput
  let cleanupBackground = false

  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    // Use AI-generated thumbnail as background
    console.log('🎨 Using AI-generated thumbnail as video background...')
    backgroundInput = thumbnailPath
  } else {
    // Fallback to title card
    const titleCardPath = path.join(CONFIG.tempDir, `titlecard-${date}.png`)
    createTitleCardPIL(devotional, titleCardPath)
    backgroundInput = titleCardPath
    cleanupBackground = true
  }

  // Create video with ffmpeg using the background (thumbnail or title card)
  const cmd = `ffmpeg -y -loop 1 -i "${backgroundInput}" -i "${audioPath}" -filter_complex "
    [1:a]showwaves=s=1920x200:mode=cline:colors=0x3b82f6|0x8b5cf6:scale=lin[viz];
    [0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[bg];
    [bg][viz]overlay=0:H-h-40:format=auto[final]
  " -map "[final]" -map 1:a -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${videoPath}"`

  execSync(cmd, { stdio: 'inherit' })

  // Cleanup title card if we created one
  if (cleanupBackground && fs.existsSync(backgroundInput)) {
    fs.unlinkSync(backgroundInput)
  }

  return videoPath
}

/**
 * Create title card using Python PIL
 */
function createTitleCardPIL(devotional, outputPath) {
  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont
import sys

# Settings
width, height = 1920, 1080
bg_color = '#0f172a'

# Create image
img = Image.new('RGB', (width, height), color=bg_color)
draw = ImageDraw.Draw(img)

# Load fonts
try:
    font_header = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
    font_date = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
    font_scripture = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
except:
    font_header = ImageFont.load_default()
    font_title = font_header
    font_date = font_header
    font_scripture = font_header

# Header - Daily Devotional
header_text = "Daily Devotional"
bbox = draw.textbbox((0, 0), header_text, font=font_header)
header_width = bbox[2] - bbox[0]
draw.text(((width - header_width) / 2, 70), header_text, fill='#64748b', font=font_header)

# Main Title
title = """${devotional.title.replace(/'/g, "\\'")}"""
bbox = draw.textbbox((0, 0), title, font=font_title)
title_width = bbox[2] - bbox[0]
# Shadow effect
draw.text(((width - title_width) / 2 + 2, 122), title, fill='#000000', font=font_title)
draw.text(((width - title_width) / 2, 120), title, fill='#ffffff', font=font_title)

# Subtitle - AI Generated
try:
    font_subtitle = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except:
    font_subtitle = font_header
subtitle_text = "(Generated 100% automatically by AI - Leave comments for suggested topics!)"
bbox = draw.textbbox((0, 0), subtitle_text, font=font_subtitle)
subtitle_width = bbox[2] - bbox[0]
draw.text(((width - subtitle_width) / 2, 200), subtitle_text, fill='#a78bfa', font=font_subtitle)

# Date
date_text = """${devotional.date.replace(/'/g, "\\'")}"""
bbox = draw.textbbox((0, 0), date_text, font=font_date)
date_width = bbox[2] - bbox[0]
draw.text(((width - date_width) / 2, 260), date_text, fill='#94a3b8', font=font_date)

# Scripture
scripture = """${devotional.scripture.replace(/'/g, "\\'")}"""
bbox = draw.textbbox((0, 0), scripture, font=font_scripture)
script_width = bbox[2] - bbox[0]
draw.text(((width - script_width) / 2, 360), scripture, fill='#fcd34d', font=font_scripture)

# User Suggestion Info (if applicable)
${
  devotional.userSuggestionInfo
    ? `
try:
    font_suggestion = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    font_comment = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
except:
    font_suggestion = font_header
    font_comment = font_header

suggestion_header = "Today's Topic Requested By:"
bbox = draw.textbbox((0, 0), suggestion_header, font=font_suggestion)
header_w = bbox[2] - bbox[0]
draw.text(((width - header_w) / 2, 480), suggestion_header, fill='#4ade80', font=font_suggestion)

# User name
author = """${devotional.userSuggestionInfo.author.replace(/'/g, "\\'")}"""
bbox = draw.textbbox((0, 0), author, font=font_suggestion)
author_w = bbox[2] - bbox[0]
draw.text(((width - author_w) / 2, 510), author, fill='#ffffff', font=font_suggestion)
`
    : ''
}

# Save
img.save("""${outputPath}""")
print(f"Title card created: ${outputPath}")
`

  const scriptPath = path.join(CONFIG.tempDir, `create_title_${Date.now()}.py`)
  fs.writeFileSync(scriptPath, pythonScript)

  try {
    execSync(`python3 "${scriptPath}"`, { stdio: 'inherit' })
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath)
    }
  }
}

/**
 * Upload to YouTube
 */
async function uploadToYouTube(videoPath, devotional, thumbnailPath = null) {
  const title = `Daily Devotional - ${devotional.title} | ${devotional.scripture}`

  // Use the youtube-studio skill to upload
  const youtubeStudioPath = path.join(process.env.HOME, 'clawd', 'skills', 'youtube-studio')
  const uploadScript = path.join(youtubeStudioPath, 'upload-simple.js')

  // Check if upload script exists, if not use fallback
  if (!fs.existsSync(uploadScript)) {
    console.log(`Upload script not found at ${uploadScript}`)
    console.log(`Would upload: ${title}`)
    if (thumbnailPath) {
      console.log(`With thumbnail: ${thumbnailPath}`)
    }
    return { videoId: 'PLACEHOLDER', status: 'uploaded' }
  }

  // For now, return placeholder - the actual upload will be handled by cron job
  // that calls the youtube-studio skill separately
  console.log(`Ready to upload: ${title}`)
  console.log(`Video path: ${videoPath}`)
  if (thumbnailPath) {
    console.log(`Thumbnail path: ${thumbnailPath}`)
  }

  return {
    videoId: 'READY_FOR_UPLOAD',
    status: 'ready',
    videoPath,
    thumbnailPath,
    title,
    description: devotional.description,
  }
}

/**
 * Check YouTube comments for user-suggested topics
 * Returns array of suggestion objects with topic, author, comment
 */
async function checkUserSuggestedTopics() {
  try {
    console.log('💬 Checking YouTube comments for user suggestions...')

    // Check if there's a comments cache file
    const suggestionsFile = path.join(CONFIG.tempDir, 'user-suggestions.json')

    if (fs.existsSync(suggestionsFile)) {
      const suggestions = JSON.parse(fs.readFileSync(suggestionsFile, 'utf8'))
      // Filter out suggestions that have been used
      const unused = suggestions.filter((s) => !s.used)
      if (unused.length > 0) {
        console.log(`Found ${unused.length} user-suggested topics`)
        return unused // Return full objects
      }
    }

    return []
  } catch (error) {
    console.warn('Could not check comments:', error.message)
    return []
  }
}

/**
 * Mark a topic as used so we don't repeat it
 */
function markTopicAsUsed(topic) {
  try {
    const suggestionsFile = path.join(CONFIG.tempDir, 'user-suggestions.json')
    let suggestions = []

    if (fs.existsSync(suggestionsFile)) {
      suggestions = JSON.parse(fs.readFileSync(suggestionsFile, 'utf8'))
    }

    const existing = suggestions.find((s) => s.topic === topic)
    if (existing) {
      existing.used = true
      existing.usedDate = new Date().toISOString()
    }

    fs.writeFileSync(suggestionsFile, JSON.stringify(suggestions, null, 2))
  } catch (error) {
    console.warn('Could not mark topic as used:', error.message)
  }
}

/**
 * Clean up temporary files
 */
function cleanup(videoPath, audioPath, thumbnailPath = null) {
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath)
    console.log(`Deleted: ${videoPath}`)
  }

  // Clean up thumbnail if it was saved to temp
  if (thumbnailPath && fs.existsSync(thumbnailPath) && thumbnailPath.includes(CONFIG.tempDir)) {
    fs.unlinkSync(thumbnailPath)
    console.log(`Deleted thumbnail: ${thumbnailPath}`)
  }

  const tempFiles = fs.readdirSync(CONFIG.tempDir)
  tempFiles.forEach((file) => {
    const filePath = path.join(CONFIG.tempDir, file)
    const stats = fs.statSync(filePath)
    const age = Date.now() - stats.mtime.getTime()

    if (age > 3600000) {
      fs.unlinkSync(filePath)
    }
  })
}

// Run if called directly
if (require.main === module) {
  runDailyDevotional().catch(console.error)
}

module.exports = {
  runDailyDevotional,
  generateDevotional,
  fetchWorldNews,
  checkUserSuggestedTopics,
  markTopicAsUsed,
}
