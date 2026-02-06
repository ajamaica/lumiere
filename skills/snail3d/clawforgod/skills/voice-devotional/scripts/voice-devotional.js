#!/usr/bin/env node

/**
 * VoiceDevotion - Main orchestrator for scripture audio generation
 *
 * Coordinates between lesson generation, TTS, and file management
 */

const fs = require('fs').promises
const path = require('path')
const LessonGenerator = require('./lesson-generator')
const TTSGenerator = require('./tts-generator')

class VoiceDevotion {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ELEVEN_LABS_API_KEY
    this.outputDir = options.outputDir || process.env.OUTPUT_DIR || './output'
    this.modelId = options.modelId || process.env.ELEVEN_LABS_MODEL_ID || 'eleven_monolingual_v1'

    if (!this.apiKey) {
      throw new Error('ELEVEN_LABS_API_KEY not configured')
    }

    this.lessonGen = new LessonGenerator()
    this.ttsGen = new TTSGenerator({
      apiKey: this.apiKey,
      modelId: this.modelId,
    })

    this.voiceSettings = this.loadVoiceSettings()
  }

  /**
   * Load voice configuration
   */
  loadVoiceSettings() {
    const configPath = path.join(__dirname, '../config/voice-settings.json')
    const content = require(configPath)
    return content
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true })
    } catch (err) {
      throw new Error(`Failed to create output directory: ${err.message}`)
    }
  }

  /**
   * Generate a daily devotional
   */
  async generateDaily(options = {}) {
    await this.ensureOutputDir()

    const { theme = 'faith', voiceId = 'josh', date = new Date(), format = 'audio' } = options

    console.log(`[Devotional] Generating daily devotional: ${theme}`)

    try {
      // 1. Generate lesson content
      const lesson = await this.lessonGen.generateDailyDevotion(theme)

      // 2. Prepare text for TTS
      const fullText = this.formatDevotion(lesson)

      // 3. Generate audio
      const audioPath = await this.generateAudio(fullText, voiceId, {
        filename: `devotional-${this.formatDate(date)}-${theme}.mp3`,
        type: 'daily-devotional',
      })

      // 4. Save metadata
      const metadata = await this.saveMetadata({
        type: 'daily-devotional',
        theme,
        audioPath,
        content: lesson,
        voiceId,
        duration: lesson.estimatedDuration || 300,
      })

      console.log(`[Devotional] ✓ Created: ${path.basename(audioPath)}`)

      return {
        audioPath,
        metadata,
        transcript: fullText,
        lesson,
      }
    } catch (err) {
      throw new Error(`Failed to generate daily devotional: ${err.message}`)
    }
  }

  /**
   * Read a scripture passage aloud
   */
  async generateScripture(options = {}) {
    await this.ensureOutputDir()

    const {
      passage = 'John 3:16',
      version = 'ESV',
      voiceId = 'josh',
      includeNotes = true,
      format = 'audio',
    } = options

    console.log(`[Scripture] Generating reading: ${passage} (${version})`)

    try {
      // 1. Generate scripture content
      const scripture = await this.lessonGen.generateScriptureReading(passage, {
        version,
        includeNotes,
      })

      // 2. Prepare text for TTS
      const fullText = this.formatScripture(scripture)

      // 3. Generate audio
      const audioPath = await this.generateAudio(fullText, voiceId, {
        filename: `scripture-${passage.replace(/\s+/g, '-').toLowerCase()}.mp3`,
        type: 'scripture-reading',
      })

      // 4. Save metadata
      const metadata = await this.saveMetadata({
        type: 'scripture-reading',
        passage,
        version,
        audioPath,
        content: scripture,
        voiceId,
      })

      console.log(`[Scripture] ✓ Created: ${path.basename(audioPath)}`)

      return {
        audioPath,
        metadata,
        transcript: fullText,
        scripture,
      }
    } catch (err) {
      throw new Error(`Failed to generate scripture reading: ${err.message}`)
    }
  }

  /**
   * Generate a multi-day reading plan
   */
  async generatePlan(options = {}) {
    await this.ensureOutputDir()

    const { topic = 'faith', days = 7, voiceId = 'josh', dailyLength = 5 } = options

    console.log(`[Plan] Generating ${days}-day plan: ${topic}`)

    const planDir = path.join(this.outputDir, `plan-${topic}-${days}d`)
    await fs.mkdir(planDir, { recursive: true })

    const results = []
    const manifest = {
      type: 'reading-plan',
      topic,
      days,
      voiceId,
      createdAt: new Date().toISOString(),
      files: [],
    }

    try {
      for (let day = 1; day <= days; day++) {
        console.log(`  [Plan] Day ${day}/${days}...`)

        // 1. Generate daily lesson
        const lesson = await this.lessonGen.generatePlanDay(topic, day, days)

        // 2. Prepare text
        const fullText = this.formatPlanDay(lesson, day, days)

        // 3. Generate audio
        const filename = `day-${String(day).padStart(2, '0')}-${topic}.mp3`
        const audioPath = await this.generateAudio(fullText, voiceId, {
          filename,
          type: 'plan-day',
          outputDir: planDir,
        })

        // 4. Save metadata
        const metadata = await this.saveMetadata(
          {
            type: 'plan-day',
            topic,
            day,
            totalDays: days,
            audioPath,
            content: lesson,
            voiceId,
          },
          planDir,
        )

        results.push({
          day,
          audioPath,
          metadata,
        })

        manifest.files.push({
          day,
          filename: path.basename(audioPath),
          metadataFile: path.basename(audioPath.replace('.mp3', '.json')),
          topic: lesson.daily_topic,
        })

        // Rate limiting
        await this.sleep(1000)
      }

      // Save manifest
      const manifestPath = path.join(planDir, 'manifest.json')
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

      console.log(`[Plan] ✓ Created ${days}-day plan at: ${planDir}`)

      return {
        planDir,
        results,
        manifest,
      }
    } catch (err) {
      throw new Error(`Failed to generate reading plan: ${err.message}`)
    }
  }

  /**
   * Generate Roman Road gospel presentation
   */
  async generateRomanRoad(options = {}) {
    await this.ensureOutputDir()

    const {
      voiceId = 'josh',
      length = 'standard', // short, standard, extended
    } = options

    console.log(`[RomanRoad] Generating gospel presentation (${length})`)

    try {
      // 1. Generate Roman Road content
      const content = await this.lessonGen.generateRomanRoad(length)

      // 2. Prepare text
      const fullText = this.formatRomanRoad(content, length)

      // 3. Generate audio
      const audioPath = await this.generateAudio(fullText, voiceId, {
        filename: `roman-road-${length}.mp3`,
        type: 'roman-road',
      })

      // 4. Save metadata
      const metadata = await this.saveMetadata({
        type: 'roman-road',
        length,
        audioPath,
        content,
        voiceId,
      })

      console.log(`[RomanRoad] ✓ Created: ${path.basename(audioPath)}`)

      return {
        audioPath,
        metadata,
        transcript: fullText,
        content,
      }
    } catch (err) {
      throw new Error(`Failed to generate Roman Road: ${err.message}`)
    }
  }

  /**
   * Generate audio from text using ElevenLabs
   */
  async generateAudio(text, voicePreset = 'josh', options = {}) {
    const voiceSettings = this.voiceSettings[voicePreset]
    if (!voiceSettings) {
      throw new Error(`Unknown voice preset: ${voicePreset}`)
    }

    const {
      filename = `audio-${Date.now()}.mp3`,
      type = 'custom',
      outputDir = this.outputDir,
    } = options

    console.log(`  [TTS] Generating audio (${voicePreset})...`)

    try {
      const audioBuffer = await this.ttsGen.generate(text, {
        voiceId: voiceSettings.voice_id,
        stability: voiceSettings.stability,
        similarity_boost: voiceSettings.similarity_boost,
        style: voiceSettings.style,
      })

      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true })

      // Write file
      const filePath = path.join(outputDir, filename)
      await fs.writeFile(filePath, audioBuffer)

      console.log(`  [TTS] ✓ Audio saved: ${filename}`)

      return filePath
    } catch (err) {
      throw new Error(`TTS generation failed: ${err.message}`)
    }
  }

  /**
   * Clean text for TTS - remove problematic punctuation
   */
  cleanTextForTTS(text) {
    // Handle non-string inputs
    if (typeof text !== 'string') {
      if (text && typeof text === 'object' && text.text) {
        text = text.text
      } else {
        return ''
      }
    }

    if (!text || text.length === 0) return ''

    return (
      text
        // Replace smart quotes with regular quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Replace em/en dashes with simple dash
        .replace(/[—–]/g, '-')
        // Replace ellipses with period
        .replace(/\.\.\./g, '. ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
        // Ensure proper spacing after punctuation
        .replace(/([.!?])([^\s])/g, '$1 $2')
        // Trim
        .trim()
    )
  }

  /**
   * Format devotion content for TTS
   */
  formatDevotion(lesson) {
    const parts = [
      `Good morning. Today's devotional focuses on ${lesson.theme}.`,
      '',
      'Scripture:',
      this.cleanTextForTTS(lesson.scripture) || 'Opening passage',
      '',
      'Reflection:',
      this.cleanTextForTTS(lesson.reflection) || 'Today we reflect on this truth',
      '',
      'Prayer:',
      this.cleanTextForTTS(lesson.prayer) || 'Closing prayer',
      '',
    ]

    return parts.join('\n')
  }

  /**
   * Format scripture reading for TTS
   */
  formatScripture(scripture) {
    const parts = [
      this.cleanTextForTTS(scripture.intro) || `Let us read from ${scripture.reference}`,
      '',
      'Scripture Reading:',
      this.cleanTextForTTS(scripture.text) || this.cleanTextForTTS(scripture.passage),
      '',
    ]

    if (scripture.notes) {
      parts.push('Notes:', this.cleanTextForTTS(scripture.notes), '')
    }

    return parts.join('\n')
  }

  /**
   * Format plan day for TTS
   */
  formatPlanDay(lesson, day, totalDays) {
    const parts = [
      `Day ${day} of ${totalDays}: ${lesson.daily_topic || 'Topic'}`,
      '',
      'Scripture:',
      this.cleanTextForTTS(lesson.daily_passage) || 'Opening',
      '',
      'Reflection:',
      this.cleanTextForTTS(lesson.daily_reflection) || 'Reflection',
      '',
      'Application:',
      this.cleanTextForTTS(lesson.daily_application) || 'Application for today',
      '',
    ]

    return parts.join('\n')
  }

  /**
   * Format Roman Road presentation
   */
  formatRomanRoad(content, length) {
    const parts = [
      'Roman Road to Salvation',
      'A journey through scripture',
      '',
      'First, all have sinned.',
      this.cleanTextForTTS(content.verse1) || 'Romans 3:23 - All have sinned and fallen short',
      '',
      'Second, the wages of sin is death.',
      this.cleanTextForTTS(content.verse2) || 'Romans 6:23 - The wages of sin is death',
      '',
      'Third, God offers a free gift.',
      this.cleanTextForTTS(content.verse3) || 'Romans 6:23 - But the gift of God is eternal life',
      '',
      'Fourth, belief and confession.',
      this.cleanTextForTTS(content.verse4) || 'Romans 10:9 - Believe in your heart and confess',
      '',
      'Will you accept this free gift of eternal life?',
    ]

    return parts.join('\n')
  }

  /**
   * Save metadata JSON file
   */
  async saveMetadata(metadata, outputDir = null) {
    const dir = outputDir || this.outputDir
    const basename = path.basename(metadata.audioPath || 'output', '.mp3')
    const metadataPath = path.join(dir, `${basename}.json`)

    const fullMetadata = {
      id: basename,
      type: metadata.type,
      audioPath: metadata.audioPath,
      duration: metadata.duration || 300,
      durationFormatted: this.formatDuration(metadata.duration || 300),
      fileSize: metadata.fileSize,
      transcript: metadata.content?.reflection || '',
      references: metadata.content?.references || [],
      voicePreset: metadata.voiceId,
      generatedAt: new Date().toISOString(),
      ...metadata,
    }

    await fs.writeFile(metadataPath, JSON.stringify(fullMetadata, null, 2))

    return fullMetadata
  }

  /**
   * Format date for filename
   */
  formatDate(date) {
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
  }

  /**
   * Format duration (seconds to MM:SS)
   */
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Sleep utility for rate limiting
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Generate multiple devotionals in batch
   */
  async generateBatch(themes, options = {}) {
    const { voiceId = 'josh', delay = 1000, includeManifest = true } = options

    console.log(`[Batch] Generating ${themes.length} devotionals...`)

    const results = []
    const manifest = {
      type: 'batch',
      count: themes.length,
      voiceId,
      createdAt: new Date().toISOString(),
      devotionals: [],
    }

    for (const theme of themes) {
      try {
        const result = await this.generateDaily({
          theme,
          voiceId,
        })

        results.push(result)
        manifest.devotionals.push({
          theme,
          filename: path.basename(result.audioPath),
          metadataFile: path.basename(result.audioPath.replace('.mp3', '.json')),
        })

        await this.sleep(delay)
      } catch (err) {
        console.error(`  [Batch] Failed to generate ${theme}: ${err.message}`)
      }
    }

    if (includeManifest) {
      const manifestPath = path.join(this.outputDir, 'batch-manifest.json')
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    }

    console.log(`[Batch] ✓ Generated ${results.length}/${themes.length} devotionals`)

    return results
  }
}

module.exports = VoiceDevotion
