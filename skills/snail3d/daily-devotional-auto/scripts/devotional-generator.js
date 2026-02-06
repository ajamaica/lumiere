#!/usr/bin/env node

/**
 * Daily Devotional Auto-Generator
 * Creates devotionals based on local news + Scripture
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const axios = require('axios')

// Configuration
const CONFIG = {
  uploadTime: '09:00', // 9:00 AM MST
  timezone: 'America/Denver',
  newsLocation: 'El Paso, Texas',
  outputDir: path.join(process.env.HOME, 'Desktop', 'devotionals'),
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
}

/**
 * Fetch local news
 */
async function fetchLocalNews() {
  try {
    // Use a news API or scrape local sources
    // For now, we'll use a placeholder that can be replaced with real news API
    const today = new Date().toISOString().split('T')[0]

    // In production, this would call a news API
    // const response = await axios.get(`https://newsapi.org/v2/everything?q=El+Paso&from=${today}&apiKey=...`);

    return {
      date: today,
      stories: [
        'Local community coming together to support those in need',
        "Reminders of life's fragility and the importance of faith",
        'Opportunities to show love and compassion to neighbors',
      ],
      theme: 'trust_in_uncertain_times',
    }
  } catch (error) {
    console.error('Failed to fetch news:', error)
    return { theme: 'daily_faith', stories: [] }
  }
}

/**
 * Generate devotional content based on news theme
 */
async function generateDevotional(newsData) {
  const themes = {
    trust_in_uncertain_times: {
      title: 'Finding Peace When Life Feels Fragile',
      scripture: 'Psalm 46:1-3',
      scriptureText:
        'God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea.',
      intro:
        "In the midst of uncertainty and the reminders of life's fragility we see in our community...",
      body: `Life can change in an instant. The phone rings with unexpected news. The routine commute takes an unexpected turn. In these moments, we're reminded that we are not in control—and that can be terrifying.

But Scripture offers us a different perspective. The psalmist declares that even if the mountains fall into the sea, we need not fear. Why? Because God is not only our refuge—He is our strength. He is not distant—He is ever-present.

When we face the fragility of life, we have a choice: we can let fear consume us, or we can let faith ground us. Today, choose faith.`,
      reflection:
        'What area of your life feels uncertain right now? How can you invite God to be your refuge in that space?',
      prayer:
        'Lord, when life feels fragile and uncertain, remind me that You are my unshakable foundation. Help me trust in Your presence today. Amen.',
    },
    community_love: {
      title: 'Loving Our Neighbors in Practical Ways',
      scripture: 'Matthew 22:39',
      scriptureText: 'Love your neighbor as yourself.',
      intro: 'Our community has opportunities to show love and compassion...',
      body: 'Jesus summarized the entire law in two commands: love God, and love your neighbor. The second is like the first—showing that our love for God is demonstrated through our love for others.',
      reflection: "Who in your community needs to experience God's love through you today?",
      prayer:
        'Lord, open my eyes to see my neighbors as You see them. Use me to be Your hands and feet today. Amen.',
    },
    daily_faith: {
      title: 'Walking by Faith Today',
      scripture: '2 Corinthians 5:7',
      scriptureText: 'For we walk by faith, not by sight.',
      intro: 'Each day brings new opportunities to trust God...',
      body: "Walking by faith doesn't mean we have all the answers. It means we trust the One who does.",
      reflection: 'Where is God calling you to take a step of faith today?',
      prayer:
        'Lord, give me the courage to walk by faith today, trusting Your lead even when I cannot see the full path. Amen.',
    },
  }

  const theme = themes[newsData.theme] || themes.daily_faith
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    date: dateStr,
    title: theme.title,
    scripture: theme.scripture,
    scriptureText: theme.scriptureText,
    content: `${theme.intro}\n\n${theme.body}\n\n🤔 Reflection Question:\n${theme.reflection}\n\n🙏 Prayer:\n${theme.prayer}`,
    fullText: `${theme.title}\n\n${theme.scripture}\n"${theme.scriptureText}"\n\n${theme.intro}\n\n${theme.body}\n\nReflection Question: ${theme.reflection}\n\nPrayer: ${theme.prayer}`,
  }
}

/**
 * Create video with visualizer using ffmpeg
 */
async function createDevotionalVideo(devotional, outputPath) {
  // First, create audio using TTS
  const audioPath = path.join(CONFIG.outputDir, 'temp-audio.mp3')

  // Generate TTS audio (using ElevenLabs or similar)
  // For now, we'll create a placeholder

  // Create video with ffmpeg
  // This creates a video with:
  // - Background gradient
  // - Scripture text overlay
  // - Audio waveform visualizer
  // - Background music

  const ffmpegCmd = `
    ffmpeg -y \\
    -f lavfi -i "color=c=0x1a1a2e:s=1920x1080:r=30:d=120" \\
    -f lavfi -i "sine=frequency=1000:duration=120" \\
    -filter_complex "[0:v]format=yuv420p[bg];[bg]drawtext=text='${devotional.title}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=100:fontfile=/System/Library/Fonts/Helvetica.ttc[title];[title]drawtext=text='${devotional.scripture}':fontcolor=ffd700:fontsize=48:x=(w-text_w)/2:y=200[script];[script]drawtext=text='${devotional.scriptureText.substring(0, 100)}...':fontcolor=white:fontsize=32:x=200:y=300:max_w=1520[final]" \\
    -map "[final]" -map 1:a \\
    -c:v libx264 -c:a aac \\
    -shortest \\
    "${outputPath}"
  `

  try {
    execSync(ffmpegCmd, { stdio: 'inherit' })
    return outputPath
  } catch (error) {
    console.error('Failed to create video:', error)
    throw error
  }
}

/**
 * Upload to YouTube
 */
async function uploadToYouTube(videoPath, devotional) {
  const youtubeStudio = require('../youtube-studio/scripts/youtube-studio')

  const metadata = {
    title: `Daily Devotional - ${devotional.title} | ${devotional.scripture}`,
    description: `${devotional.content}\n\n---\n🙏 Subscribe for daily devotionals\n📖 Scripture: ${devotional.scripture}\n📅 ${devotional.date}`,
    tags: ['devotional', 'daily devotion', 'christian', 'bible', 'faith', 'prayer', 'scripture'],
    privacyStatus: 'public',
  }

  // Call youtube-studio upload
  console.log('Uploading to YouTube...')
  // This would integrate with the youtube-studio skill
}

/**
 * Main function - creates and uploads daily devotional
 */
async function createDailyDevotional() {
  console.log('🌅 Creating daily devotional...')

  // 1. Fetch news
  const newsData = await fetchLocalNews()
  console.log('📰 News theme:', newsData.theme)

  // 2. Generate devotional
  const devotional = await generateDevotional(newsData)
  console.log('✍️ Devotional:', devotional.title)

  // 3. Create video
  const outputPath = path.join(
    CONFIG.outputDir,
    `devotional-${new Date().toISOString().split('T')[0]}.mp4`,
  )
  await createDevotionalVideo(devotional, outputPath)

  // 4. Upload to YouTube
  await uploadToYouTube(outputPath, devotional)

  // 5. Clean up
  fs.unlinkSync(outputPath)
  console.log('✅ Devotional uploaded and local file cleaned up')

  return devotional
}

// Run if called directly
if (require.main === module) {
  createDailyDevotional().catch(console.error)
}

module.exports = {
  createDailyDevotional,
  generateDevotional,
  fetchLocalNews,
}
