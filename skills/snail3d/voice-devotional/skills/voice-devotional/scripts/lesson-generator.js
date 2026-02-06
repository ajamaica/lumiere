/**
 * LessonGenerator - Creates devotional content
 *
 * Generates scripture, reflections, prayers, and teaching content
 */

const fs = require('fs')
const path = require('path')

class LessonGenerator {
  constructor() {
    this.templates = this.loadTemplates()
    this.scripture = this.loadScripture()
    this.prayers = this.loadPrayers()
  }

  /**
   * Load devotional templates
   */
  loadTemplates() {
    const templatesPath = path.join(__dirname, '../config/devotional-templates.json')
    return require(templatesPath)
  }

  /**
   * Load scripture library
   */
  loadScripture() {
    const scripturePath = path.join(__dirname, '../config/scripture-library.json')
    return require(scripturePath)
  }

  /**
   * Load prayers library
   */
  loadPrayers() {
    const prayersPath = path.join(__dirname, '../config/prayers-library.json')
    return require(prayersPath)
  }

  /**
   * Generate a daily devotion
   */
  async generateDailyDevotion(theme = 'faith') {
    const templates = this.templates['daily-devotional'] || {}
    const themeData = templates[theme] || templates.default || {}

    // Get scripture
    const scripture = this.getScripture(themeData.scripture_key)

    // Get reflection
    const reflection = this.getReflection(theme, themeData.reflection_key)

    // Get prayer
    const prayer = this.getPrayer(theme, themeData.prayer_key)

    return {
      type: 'daily-devotional',
      theme,
      scripture_reference: scripture.reference,
      scripture: scripture.text,
      reflection,
      prayer,
      references: [scripture.reference],
      estimatedDuration: 240, // ~4 minutes
    }
  }

  /**
   * Generate scripture reading with context
   */
  async generateScriptureReading(reference, options = {}) {
    const { version = 'ESV', includeNotes = true } = options

    const scripture = this.getScripture(reference)

    return {
      type: 'scripture-reading',
      reference,
      version,
      intro: `Let us read from ${reference}`,
      text: scripture.text,
      context: scripture.context,
      notes: includeNotes ? scripture.notes : null,
      themes: scripture.themes || [],
      estimatedDuration: 180, // ~3 minutes
    }
  }

  /**
   * Generate a day in a reading plan
   */
  async generatePlanDay(topic, day, totalDays) {
    const templates = this.templates['reading-plan'] || {}
    const planData = templates[topic] || {}
    const dayData = planData.days ? planData.days[day - 1] : null

    if (!dayData) {
      // Fallback to generic day
      const scripture = this.getScripture(topic)
      return {
        daily_number: day,
        daily_topic: `${topic.charAt(0).toUpperCase() + topic.slice(1)} - Day ${day}`,
        daily_passage: scripture.reference,
        daily_passage_text: scripture.text,
        daily_reflection: this.getReflection(topic),
        daily_application: `Apply ${topic} to your life today`,
        daily_scripture_key: scripture.reference,
      }
    }

    return {
      daily_number: day,
      daily_topic: dayData.topic || `${topic} - Day ${day}`,
      daily_passage: dayData.passage,
      daily_passage_text: this.getScripture(dayData.passage).text,
      daily_reflection: dayData.reflection || this.getReflection(topic),
      daily_application: dayData.application || `How can you apply this to your life?`,
      daily_scripture_key: dayData.passage,
    }
  }

  /**
   * Generate Roman Road gospel presentation
   */
  async generateRomanRoad(length = 'standard') {
    // Length: short (8m), standard (12m), extended (15m)

    const romanRoadScriptures = {
      verse1: {
        reference: 'Romans 3:23',
        text: 'For all have sinned and fall short of the glory of God.',
        explanation: "Every person has sinned. Sin is breaking God's law.",
      },
      verse2: {
        reference: 'Romans 6:23a',
        text: 'For the wages of sin is death,',
        explanation: 'Sin has a consequence - spiritual death and separation from God.',
      },
      verse3: {
        reference: 'Romans 6:23b',
        text: 'but the gift of God is eternal life in Christ Jesus our Lord.',
        explanation: 'But God offers a free gift - eternal life through Jesus.',
      },
      verse4: {
        reference: 'Romans 10:9',
        text: 'If you declare with your mouth, "Jesus is Lord," and believe in your heart that God raised him from the dead, you will be saved.',
        explanation: 'All you need to do is believe and confess.',
      },
    }

    let content = {
      title: 'Roman Road to Salvation',
      length,
      verses: romanRoadScriptures,
      invitation: "Will you accept God's free gift today?",
    }

    if (length === 'extended') {
      content.closing = `This is the path to eternal life. 
        First acknowledge that you are a sinner and need forgiveness.
        Then believe that Jesus died for your sins and rose again.
        Finally, surrender your life to Jesus as Lord.
        If you\'ve prayed this prayer sincerely, welcome to God\'s family.`
    } else if (length === 'short') {
      content.summary =
        'All have sinned. Sin leads to death. Jesus offers life. Believe and confess.'
    }

    return content
  }

  /**
   * Get scripture text by reference
   */
  getScripture(reference) {
    if (!reference) {
      reference = 'John 3:16'
    }

    // Try exact match first
    if (this.scripture[reference]) {
      return this.scripture[reference]
    }

    // Try to extract book and verse
    const match = reference.match(/^(\w+)\s+(\d+):(\d+)(?:-(\d+))?/)
    if (match) {
      const [, book, chapter, verse] = match
      const key = `${book} ${chapter}:${verse}`
      if (this.scripture[key]) {
        return this.scripture[key]
      }
    }

    // Fallback
    return (
      this.scripture['John 3:16'] || {
        reference,
        text: 'Scripture text not found in library. Please add this reference.',
        context: '',
        notes: '',
      }
    )
  }

  /**
   * Get reflection text by theme
   */
  getReflection(theme, key = null) {
    const reflections = this.templates['reflections'] || {}

    if (key && reflections[key]) {
      return reflections[key]
    }

    // Try theme-based lookup
    if (reflections[theme]) {
      const themeReflections = reflections[theme]
      if (Array.isArray(themeReflections)) {
        return themeReflections[Math.floor(Math.random() * themeReflections.length)]
      }
      return themeReflections
    }

    // Generic reflection
    return `Today we reflect on the theme of ${theme}. 
      How does this apply to your life right now? 
      Take a moment to consider God's truth and how it transforms your perspective.`
  }

  /**
   * Get prayer by theme
   */
  getPrayer(theme, key = null) {
    const prayers = this.prayers || {}

    if (key && prayers[key]) {
      return prayers[key]
    }

    // Try theme-based lookup
    if (prayers[theme]) {
      const themePrayers = prayers[theme]
      if (Array.isArray(themePrayers)) {
        return themePrayers[Math.floor(Math.random() * themePrayers.length)]
      }
      return themePrayers
    }

    // Generic closing prayer
    return `Lord, help me to embrace the truth of ${theme} today. 
      Transform my heart and mind through Your Word. 
      Give me wisdom to apply these truths to my life. 
      In Jesus' name, Amen.`
  }

  /**
   * Generate custom devotional from template
   */
  async generateCustom(template, options = {}) {
    return {
      type: 'custom-devotional',
      ...template,
      ...options,
      generatedAt: new Date().toISOString(),
    }
  }
}

module.exports = LessonGenerator
