#!/usr/bin/env node

/**
 * Generate a sample devotional video with Snail's voice
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

const CONFIG = {
  outputDir: path.join(process.env.HOME, 'Desktop', 'devotionals'),
  tempDir: path.join(process.env.HOME, '.clawd-devotional', 'temp'),
  voiceId: 'eAfXdNE5aiS46rHwX5Mv',
}

// Sample devotional for testing
const sampleDevotional = {
  date: 'Wednesday, February 5, 2026',
  title: 'Finding Peace in the Storm',
  scripture: 'Mark 4:39',
  scriptureText:
    'He got up, rebuked the wind and said to the waves, "Quiet! Be still!" Then the wind died down and it was completely calm.',
  intro:
    'From the news today, we see storms brewing - both literal and metaphorical. Life has a way of overwhelming us when we least expect it.',
  body: `The disciples were terrified. Waves were crashing over the boat. The wind was howling. And Jesus? He was sleeping.

They woke him, desperate and afraid. "Teacher, don't you care if we drown?"

With three words, everything changed. "Quiet! Be still!"

The storm didn't gradually fade. It didn't slowly settle. It immediately obeyed. Because the One who spoke it into existence was the One commanding it now.

Whatever storm you're facing today - whether it rages in your health, your relationships, your finances, or your heart - the same Jesus who calmed that sea is present with you. He is not distant. He is not unaware. He is in the boat with you.

The question isn't whether Jesus can calm your storm. The question is whether you'll invite him into it.`,
  reflection: 'What storm are you facing that you need Jesus to speak peace into?',
  prayer:
    'Lord, when the waves crash and the wind howls, remind me that You are in the boat with me. Speak Your peace into my chaos. I trust You. In Jesus name, Amen.',
  fullText: function () {
    return `${this.title}

${this.scripture}
"${this.scriptureText}"

${this.intro}

${this.body}

Reflection Question: ${this.reflection}

Prayer: ${this.prayer}`
  },
}

async function generateSampleVideo() {
  console.log('🎬 Creating Sample Devotional Video\n')

  // 1. Create TTS audio
  console.log('🎙️ Generating audio with ElevenLabs voice...')
  const audioPath = await createTTS(sampleDevotional)

  // 2. Create title card
  console.log('🎨 Creating title card...')
  const titleCardPath = path.join(CONFIG.tempDir, `sample-titlecard.png`)
  createTitleCard(sampleDevotional, titleCardPath)

  // 3. Create video
  console.log('🎥 Rendering video...')
  const videoPath = path.join(CONFIG.outputDir, `sample-devotional-${Date.now()}.mp4`)
  await createVideo(audioPath, titleCardPath, videoPath)

  // 4. Cleanup
  if (fs.existsSync(titleCardPath)) {
    fs.unlinkSync(titleCardPath)
  }

  console.log('\n✅ Sample video created!')
  console.log(`📁 Location: ${videoPath}`)
  console.log('\n📝 Description preview:')
  console.log(formatDescription(sampleDevotional))
}

async function createTTS(devotional) {
  const audioPath = path.join(CONFIG.tempDir, `sample-audio-${Date.now()}.mp3`)
  const text = devotional.fullText()

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

  if (!ELEVENLABS_API_KEY) {
    console.log('⚠️  ELEVENLABS_API_KEY not set. Creating placeholder audio...')
    console.log('   To use your voice, set: export ELEVENLABS_API_KEY=your_key')
    // Create a silent/placeholder audio file for demo
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 120 -acodec libmp3lame "${audioPath}" -y`,
      { stdio: 'ignore' },
    )
    return audioPath
  }

  try {
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.voiceId}`,
      headers: {
        Accept: 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      data: {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      responseType: 'arraybuffer',
    })

    fs.writeFileSync(audioPath, Buffer.from(response.data))
    console.log('✅ Audio generated with your voice!')
    return audioPath
  } catch (error) {
    console.error('❌ ElevenLabs failed:', error.message)
    console.log('Creating placeholder audio...')
    execSync(
      `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 120 -acodec libmp3lame "${audioPath}" -y`,
      { stdio: 'ignore' },
    )
    return audioPath
  }
}

function createTitleCard(devotional, outputPath) {
  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont

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
    font_subtitle = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except:
    font_header = ImageFont.load_default()
    font_title = font_header
    font_date = font_header
    font_scripture = font_header
    font_subtitle = font_header

# Header - Daily Devotional
header_text = "Daily Devotional"
bbox = draw.textbbox((0, 0), header_text, font=font_header)
header_width = bbox[2] - bbox[0]
draw.text(((width - header_width) / 2, 70), header_text, fill='#64748b', font=font_header)

# Main Title
title = """${devotional.title.replace(/'/g, "\\'")}"""
bbox = draw.textbbox((0, 0), title, font=font_title)
title_width = bbox[2] - bbox[0]
draw.text(((width - title_width) / 2 + 2, 122), title, fill='#000000', font=font_title)
draw.text(((width - title_width) / 2, 120), title, fill='#ffffff', font=font_title)

# Subtitle - AI Generated
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

# Save
img.save("""${outputPath}""")
print(f"Title card created: ${outputPath}")
`

  const scriptPath = path.join(CONFIG.tempDir, `create_sample_title.py`)
  fs.writeFileSync(scriptPath, pythonScript)

  try {
    execSync(`python3 "${scriptPath}"`, { stdio: 'inherit' })
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath)
    }
  }
}

async function createVideo(audioPath, titleCardPath, outputPath) {
  const cmd = `ffmpeg -y -loop 1 -i "${titleCardPath}" -i "${audioPath}" -filter_complex "
    [1:a]showwaves=s=1920x180:mode=cline:colors=0x3b82f6|0x8b5cf6[viz];
    [0:v][viz]overlay=0:H-h-30:format=auto[final]
  " -map "[final]" -map 1:a -c:v libx264 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${outputPath}"`

  execSync(cmd, { stdio: 'inherit' })
}

function formatDescription(devotional) {
  return `${devotional.intro}

${devotional.body}

🤔 Reflection Question:
${devotional.reflection}

🙏 Prayer:
${devotional.prayer}

---
🌅 Daily Devotional for ${devotional.date}
📖 Scripture: ${devotional.scripture}

🤖 This devotional was generated 100% automatically by AI based on current news and/or viewer suggestions.

💬 Have a topic you'd like us to cover? Leave a comment below with your suggestion! We read every comment and may feature your topic in a future devotional.

---
📝 A Note from Snail:

"I know this is a little bit weird and freaky, but I'm trying to prove a point with this: automations can be used for Kingdom work and to inspire people to make their own things for Jesus and His glory. I'm not trying to replace any pastor or subvert their authority. Please keep in mind that this was written, composed, and even posted entirely by AI. So please post in the comments if you see any errors."

📢 Subscribe for daily encouragement and biblical perspective on current events!`
}

// Run
generateSampleVideo().catch(console.error)
