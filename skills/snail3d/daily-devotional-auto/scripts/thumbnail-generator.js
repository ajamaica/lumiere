#!/usr/bin/env node

/**
 * Generate eye-catching thumbnails for daily devotionals
 * Uses Gemini/Nano Banana for AI-generated backgrounds + text overlay
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CONFIG = {
  outputDir: path.join(process.env.HOME, 'Desktop', 'devotionals'),
  tempDir: path.join(process.env.HOME, '.clawd-devotional', 'temp'),
  nanoBananaPath: path.join(process.env.HOME, 'clawd', 'nano-banana-pro'),
}

// Thumbnail style templates based on devotional theme
const THUMBNAIL_STYLES = {
  peace: {
    vibe: 'serene sunrise, soft golden light, gentle clouds, peaceful landscape',
    colors: 'warm golds, soft blues, gentle gradients',
    mood: 'calm, hopeful, uplifting',
  },
  storm: {
    vibe: 'dramatic storm clouds breaking with sunlight, powerful waves, lighthouse beacon',
    colors: 'deep blues, grays, striking gold light breaking through',
    mood: 'dramatic, powerful, overcoming',
  },
  guidance: {
    vibe: 'winding path through mountains, compass, northern lights, starry sky',
    colors: 'deep purples, blues, silver accents',
    mood: 'mysterious, guiding, adventurous',
  },
  hope: {
    vibe: 'dawn breaking over mountains, flower blooming through concrete, rainbow',
    colors: 'vibrant oranges, pinks, fresh greens',
    mood: 'optimistic, fresh, renewing',
  },
  comfort: {
    vibe: 'cozy candlelight, open Bible on wooden table, soft blanket, warm fireplace',
    colors: 'warm amber, soft browns, cream tones',
    mood: 'cozy, intimate, nurturing',
  },
  faith: {
    vibe: 'cross on hill at sunset, praying hands silhouette, dove in flight',
    colors: 'rich purples, golds, dramatic sunset',
    mood: 'reverent, inspiring, spiritual',
  },
  breaking_news: {
    vibe: 'modern abstract with news elements, world map, connecting lines, light bursts',
    colors: 'bold reds, whites, blues, high contrast',
    mood: 'urgent, relevant, timely',
  },
}

// Generate AI image prompt based on devotional content
function generateThumbnailPrompt(devotional) {
  const title = devotional.title.toLowerCase()
  const body = devotional.body.toLowerCase()
  const scripture = devotional.scripture.toLowerCase()

  // Determine theme
  let theme = 'peace' // default

  if (
    title.includes('storm') ||
    body.includes('storm') ||
    body.includes('waves') ||
    title.includes('crisis')
  ) {
    theme = 'storm'
  } else if (title.includes('guid') || body.includes('path') || body.includes('direction')) {
    theme = 'guidance'
  } else if (title.includes('hope') || body.includes('hope') || title.includes('new')) {
    theme = 'hope'
  } else if (title.includes('comfort') || body.includes('comfort') || body.includes('peace')) {
    theme = 'comfort'
  } else if (title.includes('faith') || scripture.includes('faith') || title.includes('trust')) {
    theme = 'faith'
  } else if (devotional.newsContext) {
    theme = 'breaking_news'
  }

  const style = THUMBNAIL_STYLES[theme]

  // Build the prompt
  const prompt = `YouTube thumbnail for daily devotional video. ${style.vibe}. 
${style.colors}. ${style.mood} mood.

CRITICAL: Leave clear empty space in the center and top area for text overlay.
No text in the image itself. Clean composition with good negative space.
Professional, cinematic lighting. 16:9 aspect ratio composition.
Eye-catching, click-worthy, high contrast. No people faces, abstract or symbolic imagery only.

Style: Modern Christian aesthetic, Instagram-worthy, trending on Pinterest, professional photography quality.`

  return {
    prompt: prompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
    theme,
    style,
  }
}

// Generate the thumbnail
async function generateThumbnail(devotional, options = {}) {
  console.log('🎨 Generating devotional thumbnail...\n')

  const { prompt, theme, style } = generateThumbnailPrompt(devotional)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `thumbnail-${timestamp}-${theme}.png`
  const outputPath = path.join(options.outputDir || CONFIG.outputDir, filename)

  console.log(`Theme: ${theme}`)
  console.log(`Style: ${style.vibe.substring(0, 60)}...`)
  console.log(`\nGenerating image with Nano Banana...`)

  // Generate base image using nano-banana-pro
  const nanoBananaScript = path.join(CONFIG.nanoBananaPath, 'scripts', 'generate_image.py')

  if (!fs.existsSync(nanoBananaScript)) {
    console.error('❌ nano-banana-pro not found. Install it first:')
    console.error('   clawdhub install nano-banana-pro')
    return null
  }

  try {
    // Generate 1K first (faster iteration)
    const resolution = options.resolution || '1K'
    const cmd = `uv run ${nanoBananaScript} --prompt "${prompt}" --filename "${filename}" --resolution ${resolution}`

    console.log(`Running: ${cmd.substring(0, 100)}...`)
    execSync(cmd, {
      cwd: options.outputDir || CONFIG.outputDir,
      stdio: 'inherit',
      env: { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY },
    })

    console.log(`\n✅ Thumbnail generated: ${outputPath}`)

    // Add text overlay using Python PIL
    console.log('\n📝 Adding text overlay...')
    const finalPath = await addTextOverlay(outputPath, devotional, theme)

    return {
      baseImage: outputPath,
      finalThumbnail: finalPath,
      theme,
      prompt,
    }
  } catch (error) {
    console.error('❌ Failed to generate thumbnail:', error.message)
    return null
  }
}

// Add text overlay to thumbnail
async function addTextOverlay(imagePath, devotional, theme) {
  const finalPath = imagePath.replace('.png', '-final.png')

  const pythonScript = `
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import sys

# Load image
img = Image.open("${imagePath}")
width, height = img.size

# Convert to RGB if necessary
if img.mode != 'RGB':
    img = img.convert('RGB')

# Create overlay for better text readability
overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# Add gradient overlay at top for title
for i in range(150):
    alpha = int(180 * (1 - i/150))  # Fade out
    draw.line([(0, i), (width, i)], fill=(0, 0, 0, alpha))

# Add gradient at bottom for scripture - taller for bigger text
draw.rectangle([0, height-180, width, height], fill=(0, 0, 0, 180))

# Composite
img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
draw = ImageDraw.Draw(img)

# Load fonts - BIGGER for better readability
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 56)
    font_scripture = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)  # Bigger!
    font_date = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)  # Bigger!
except:
    font_title = ImageFont.load_default()
    font_scripture = font_title
    font_date = font_title

# Draw title
title = """${devotional.title.replace(/'/g, "\\'")}"""
# Wrap text if too long
words = title.split()
lines = []
line = []
for word in words:
    test_line = ' '.join(line + [word])
    bbox = draw.textbbox((0, 0), test_line, font=font_title)
    if bbox[2] - bbox[0] < width - 80:
        line.append(word)
    else:
        lines.append(' '.join(line))
        line = [word]
lines.append(' '.join(line))

# Draw title lines with shadow
y = 30
for line in lines[:2]:  # Max 2 lines
    # Shadow
    draw.text((22, y+2), line, fill=(0, 0, 0), font=font_title)
    # Text
    draw.text((20, y), line, fill=(255, 255, 255), font=font_title)
    y += 55

# Draw scripture at bottom - BIGGER
scripture = """${devotional.scripture.replace(/'/g, "\\'")}"""
draw.text((22, height-140), scripture, fill=(0, 0, 0), font=font_scripture)
draw.text((20, height-142), scripture, fill=(255, 215, 0), font=font_scripture)  # Gold

# Draw date - BIGGER
date_str = """${devotional.date.replace(/'/g, "\\'")}"""
draw.text((22, height-75), date_str, fill=(0, 0, 0), font=font_date)
draw.text((20, height-77), date_str, fill=(220, 220, 220), font=font_date)

# Save
img.save("${finalPath}")
print(f"Final thumbnail saved: ${finalPath}")
`

  const scriptPath = path.join(CONFIG.tempDir, 'add_text_overlay.py')
  fs.writeFileSync(scriptPath, pythonScript)

  try {
    execSync(`python3 "${scriptPath}"`, { stdio: 'inherit' })
    return finalPath
  } catch (error) {
    console.warn('⚠️  Text overlay failed, returning base image')
    return imagePath
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath)
    }
  }
}

// Test/demo function
async function testThumbnailGeneration() {
  const testDevotional = {
    title: 'Finding Peace in the Storm',
    scripture: 'Mark 4:39',
    body: 'When the waves crash and the wind howls...',
    date: 'Wednesday, February 5, 2026',
    newsContext: null,
  }

  console.log('🧪 Testing thumbnail generation...\n')
  const result = await generateThumbnail(testDevotional, { resolution: '1K' })

  if (result) {
    console.log('\n✅ Test complete!')
    console.log(`Base image: ${result.baseImage}`)
    console.log(`Final thumbnail: ${result.finalThumbnail}`)
    console.log(`Theme: ${result.theme}`)
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.includes('--test')) {
    testThumbnailGeneration().catch(console.error)
  } else {
    console.log('Usage: node thumbnail-generator.js --test')
    console.log('Or import and use generateThumbnail(devotional, options)')
  }
}

module.exports = {
  generateThumbnail,
  generateThumbnailPrompt,
  THUMBNAIL_STYLES,
  testThumbnailGeneration,
}
