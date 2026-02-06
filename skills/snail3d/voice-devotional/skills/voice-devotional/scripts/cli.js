#!/usr/bin/env node

/**
 * Voice Devotional CLI
 * Command-line interface for generating scripture audio
 */

require('dotenv').config()
const VoiceDevotion = require('./voice-devotional')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]
const options = parseArgs(args.slice(1))

/**
 * Parse command line arguments into options object
 */
function parseArgs(argv) {
  const opts = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true
      opts[key] = value
      if (value !== true) i++
    }
  }
  return opts
}

/**
 * Display help text
 */
function showHelp(command = null) {
  const help = {
    default: `
voice-devotional - Generate scripture audio with TTS

USAGE:
  voice-devotional <command> [options]

COMMANDS:
  daily              Generate a daily devotional (3-5 min)
  scripture          Read a scripture passage
  plan               Create a multi-day reading plan
  roman-road         Generate gospel presentation
  generate           Generate with custom template
  batch              Generate multiple devotionals
  help               Show this help

GLOBAL OPTIONS:
  --voice VOICE      Voice preset: josh, chris, bella (default: josh)
  --format FORMAT    Output: audio, transcript, both (default: audio)
  --output DIR       Output directory (default: ./output)

EXAMPLES:
  voice-devotional daily --theme peace
  voice-devotional scripture --passage "John 3:16"
  voice-devotional plan --topic hope --days 7
  voice-devotional roman-road --voice bella

Use 'voice-devotional help <command>' for more info on a command.
    `,
    daily: `
voice-devotional daily - Generate a daily devotional

USAGE:
  voice-devotional daily [options]

OPTIONS:
  --theme THEME      Devotional theme (peace, hope, faith, love, strength, etc.)
  --voice VOICE      Voice preset: josh, chris, bella (default: josh)
  --format FORMAT    Output: audio, transcript, both (default: audio)
  --date DATE        Date for devotional (default: today, format: YYYY-MM-DD)
  --output DIR       Output directory (default: ./output)

EXAMPLES:
  voice-devotional daily --theme peace
  voice-devotional daily --theme hope --voice bella --format both
  voice-devotional daily --theme faith --date 2024-01-20
    `,
    scripture: `
voice-devotional scripture - Read a scripture passage

USAGE:
  voice-devotional scripture [options]

OPTIONS:
  --passage PASSAGE  Scripture reference (e.g., "John 3:16", "Romans 8:1-17")
  --version VERSION  Bible version: ESV, NIV, KJV, NASB (default: ESV)
  --voice VOICE      Voice preset (default: josh)
  --format FORMAT    Output format (default: audio)
  --include-notes    Include theological notes (default: true)

EXAMPLES:
  voice-devotional scripture --passage "Psalm 23"
  voice-devotional scripture --passage "John 3:16" --voice bella
  voice-devotional scripture --passage "1 Corinthians 13" --format both
    `,
    plan: `
voice-devotional plan - Create a multi-day reading plan

USAGE:
  voice-devotional plan [options]

OPTIONS:
  --topic TOPIC      Plan topic (hope, faith, peace, love, strength, etc.)
  --days DAYS        Number of days (default: 7)
  --voice VOICE      Voice preset (default: josh)
  --format FORMAT    Output format (default: audio)
  --daily-length MIN Minutes per day (default: 5)

EXAMPLES:
  voice-devotional plan --topic hope --days 7
  voice-devotional plan --topic faith --days 14 --voice chris
  voice-devotional plan --topic peace --days 3 --daily-length 3

OUTPUT:
  Creates a directory with individual daily MP3s plus manifest.json
    `,
    'roman-road': `
voice-devotional roman-road - Gospel presentation

USAGE:
  voice-devotional roman-road [options]

OPTIONS:
  --voice VOICE      Voice preset (default: josh)
  --format FORMAT    Output format (default: audio)
  --length LENGTH    Presentation: short, standard, extended (default: standard)

EXAMPLES:
  voice-devotional roman-road
  voice-devotional roman-road --voice bella --length short
  voice-devotional roman-road --format both --length extended
    `,
    batch: `
voice-devotional batch - Generate multiple devotionals

USAGE:
  voice-devotional batch [options]

OPTIONS:
  --count NUM        Number of devotionals to generate
  --themes FILE      JSON file with list of themes
  --template TEMPLATE Template to use for all
  --delay MS         Delay between requests (default: 1000)
  --parallel NUM     Parallel generation (default: 1)

EXAMPLES:
  voice-devotional batch --count 7
  voice-devotional batch --themes themes.json --voice josh --delay 2000
    `,
  }

  const text = help[command] || help.default
  console.log(text)
}

/**
 * Main CLI handler
 */
async function main() {
  try {
    // Show help
    if (!command || command === 'help' || command === '-h' || command === '--help') {
      showHelp(args[1])
      process.exit(0)
    }

    // Initialize VoiceDevotion
    const vd = new VoiceDevotion({
      apiKey: process.env.ELEVEN_LABS_API_KEY,
      outputDir: options.output || process.env.OUTPUT_DIR || './output',
      modelId: process.env.ELEVEN_LABS_MODEL_ID,
    })

    // Validate API key
    console.log('[Setup] Validating ElevenLabs API key...')
    const validation = await vd.ttsGen.validateApiKey()
    if (!validation.valid) {
      console.error('❌ API Key validation failed:', validation.error)
      console.error('Please check your ELEVEN_LABS_API_KEY in .env')
      process.exit(1)
    }
    console.log(`✓ API Key valid (${validation.subscription_tier} tier)`)

    // Execute command
    let result

    switch (command) {
      case 'daily':
        result = await vd.generateDaily({
          theme: options.theme || 'faith',
          voiceId: options.voice || 'josh',
          date: options.date ? new Date(options.date) : new Date(),
          format: options.format || 'audio',
        })
        displayResult(result, 'Daily Devotional')
        break

      case 'scripture':
        result = await vd.generateScripture({
          passage: options.passage || 'John 3:16',
          version: options.version || 'ESV',
          voiceId: options.voice || 'josh',
          includeNotes: options['include-notes'] !== 'false',
          format: options.format || 'audio',
        })
        displayResult(result, 'Scripture Reading')
        break

      case 'plan':
        result = await vd.generatePlan({
          topic: options.topic || 'faith',
          days: parseInt(options.days || 7),
          voiceId: options.voice || 'josh',
          dailyLength: parseInt(options['daily-length'] || 5),
        })
        displayPlanResult(result)
        break

      case 'roman-road':
        result = await vd.generateRomanRoad({
          voiceId: options.voice || 'josh',
          length: options.length || 'standard',
        })
        displayResult(result, 'Roman Road Presentation')
        break

      case 'batch':
        const themes = options.themes
          ? require(path.resolve(options.themes))
          : generateDefaultThemes(parseInt(options.count || 7))

        result = await vd.generateBatch(themes, {
          voiceId: options.voice || 'josh',
          delay: parseInt(options.delay || 1000),
        })
        displayBatchResult(result)
        break

      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }

    console.log('\n✓ Done!')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Error:', err.message)
    process.exit(1)
  }
}

/**
 * Display result
 */
function displayResult(result, title) {
  console.log(`\n📖 ${title}`)
  console.log('─'.repeat(50))

  if (result.metadata) {
    const meta = result.metadata
    console.log(`ID:          ${meta.id}`)
    console.log(`Type:        ${meta.type}`)
    console.log(`Audio Path:  ${meta.audioPath}`)
    console.log(`Duration:    ${meta.durationFormatted || 'N/A'}`)
    console.log(`Voice:       ${meta.voicePreset}`)
    console.log(`Generated:   ${new Date(meta.generatedAt).toLocaleString()}`)

    if (meta.references && meta.references.length > 0) {
      console.log(`References:  ${meta.references.join(', ')}`)
    }
  }

  if (result.lesson && result.lesson.theme) {
    console.log(`Theme:       ${result.lesson.theme}`)
  }

  if (result.scripture && result.scripture.reference) {
    console.log(`Passage:     ${result.scripture.reference}`)
  }

  console.log('─'.repeat(50))
}

/**
 * Display plan result
 */
function displayPlanResult(result) {
  const manifest = result.manifest
  console.log(`\n📚 Reading Plan: ${manifest.topic}`)
  console.log(`─`.repeat(50))
  console.log(`Days:     ${manifest.days}`)
  console.log(`Voice:    ${manifest.voiceId}`)
  console.log(`Location: ${result.planDir}`)
  console.log(`\nGenerated files:`)

  manifest.files.forEach((f) => {
    console.log(`  ${f.day}. ${f.topic}`)
    console.log(`     → ${f.filename}`)
  })

  console.log('─'.repeat(50))
}

/**
 * Display batch result
 */
function displayBatchResult(results) {
  console.log(`\n🎯 Batch Generated`)
  console.log('─'.repeat(50))
  console.log(`Total:    ${results.length} devotionals`)

  results.forEach((r) => {
    if (r.lesson && r.lesson.theme) {
      console.log(`  • ${r.lesson.theme}`)
    }
  })

  console.log('─'.repeat(50))
}

/**
 * Generate default themes for batch
 */
function generateDefaultThemes(count) {
  const themes = ['peace', 'hope', 'faith', 'love', 'strength', 'joy', 'grace', 'trust']
  return themes.slice(0, Math.min(count, themes.length))
}

// Run CLI
main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
