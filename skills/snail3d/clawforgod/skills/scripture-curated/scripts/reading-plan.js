#!/usr/bin/env node
/**
 * Reading Plan Generator
 *
 * Generates connected Scripture reading plans
 * with thematic coherence and daily applications.
 */

const fs = require('fs')
const path = require('path')

class ReadingPlan {
  constructor(options = {}) {
    this.versesPath = options.versesPath || path.join(__dirname, '..', 'config', 'verses.json')
    this.verses = this.loadVerses()
  }

  loadVerses() {
    try {
      const data = fs.readFileSync(this.versesPath, 'utf8')
      return JSON.parse(data)
    } catch (e) {
      console.error('Failed to load verses:', e.message)
      return { themes: {} }
    }
  }

  /**
   * Generate a reading plan
   */
  generate(options = {}) {
    const {
      theme,
      days = 7,
      startVerse,
      progression = 'thematic', // 'thematic', 'canonical', 'devotional'
    } = options

    const themeData = this.verses.themes[theme]
    if (!themeData) {
      return this.generateFallbackPlan(days)
    }

    const plan = {
      theme,
      days,
      progression,
      verses: [],
      overview: this.generateOverview(theme, days),
      instructions: this.generateInstructions(days),
    }

    // Get available verses
    let availableVerses = [...themeData.verses]

    // If start verse specified, prioritize it
    if (startVerse) {
      const startIndex = availableVerses.findIndex((v) => v.id === startVerse)
      if (startIndex >= 0) {
        const [start] = availableVerses.splice(startIndex, 1)
        availableVerses.unshift(start)
      }
    }

    // Order verses based on progression
    availableVerses = this.orderVerses(availableVerses, progression)

    // Select verses for each day
    for (let i = 0; i < Math.min(days, availableVerses.length); i++) {
      const verse = availableVerses[i]
      const dayPlan = this.createDayPlan(verse, i + 1, days, theme)
      plan.verses.push(dayPlan)
    }

    // Add connections between days
    this.addConnections(plan)

    return plan
  }

  /**
   * Order verses based on progression type
   */
  orderVerses(verses, progression) {
    switch (progression) {
      case 'canonical':
        // Order by biblical canon (simplified)
        return verses.sort((a, b) => {
          const bookOrder = this.getBookOrder(a.reference) - this.getBookOrder(b.reference)
          if (bookOrder !== 0) return bookOrder
          return this.getChapterVerse(a.reference) - this.getChapterVerse(b.reference)
        })

      case 'devotional':
        // Order by intensity/application
        return verses.sort((a, b) => {
          const intensityA = this.getDevotionalIntensity(a)
          const intensityB = this.getDevotionalIntensity(b)
          return intensityA - intensityB // Build from gentler to stronger
        })

      case 'thematic':
      default:
        // Keep original theme order or random
        return verses
    }
  }

  /**
   * Create a single day's plan
   */
  createDayPlan(verse, day, totalDays, theme) {
    const progress = day / totalDays

    return {
      day,
      reference: verse.reference,
      text: verse.text,

      // Context varies by position in plan
      context: this.getContextForDay(verse, progress),

      // Application varies by progress
      application: this.getApplicationForDay(verse, day, totalDays, theme),

      // Reflection questions
      questions: this.generateQuestions(verse, progress),

      // Prayer focus
      prayer: this.generatePrayer(verse, theme),

      // Memory verse flag
      memoryVerse: day === 4, // Middle of week

      // Cross-references
      seeAlso: this.getSeeAlso(verse),
    }
  }

  /**
   * Get context appropriate for day's position
   */
  getContextForDay(verse, progress) {
    if (progress < 0.3) {
      return `Foundation: ${verse.context}`
    } else if (progress < 0.7) {
      return `Building: ${verse.context}`
    } else {
      return `Culmination: ${verse.context}`
    }
  }

  /**
   * Get application appropriate for day's position
   */
  getApplicationForDay(verse, day, totalDays, theme) {
    const progress = day / totalDays

    if (progress < 0.3) {
      // Beginning: Understanding
      return `Day ${day}: Begin here. Read slowly. What does this reveal about ${theme}?`
    } else if (progress < 0.7) {
      // Middle: Application
      return `Day ${day}: Build on previous days. How does this expand your understanding of ${theme}? What changes if you live this?`
    } else {
      // End: Transformation
      return `Day ${day}: Culmination. How does this complete the picture? Commit to one way you'll live this truth today.`
    }
  }

  /**
   * Generate reflection questions
   */
  generateQuestions(verse, progress) {
    const questions = []

    // Observation
    questions.push(`What does this verse say about God?`)
    questions.push(`What does this verse say about humanity?`)

    // Interpretation
    if (progress > 0.3) {
      questions.push(`How does this connect to what you've read earlier?`)
    }

    // Application
    questions.push(`What would it look like to live this today?`)

    // Deeper reflection for later days
    if (progress > 0.5) {
      questions.push(`Where do you resist this truth?`)
    }

    return questions
  }

  /**
   * Generate prayer focus
   */
  generatePrayer(verse, theme) {
    const prayers = {
      peace: 'Lord, give me Your peace that surpasses understanding.',
      hope: 'Father, anchor my hope in Your promises.',
      faith: 'God, increase my trust in You.',
      love: 'Spirit, fill me with Your love for others.',
      suffering: 'Jesus, be near to me in my pain.',
      redemption: 'Lord, thank You for saving me.',
      default: 'Father, help me understand and live Your Word.',
    }

    return prayers[theme] || prayers.default
  }

  /**
   * Get cross-references
   */
  getSeeAlso(verse) {
    return verse.events?.slice(0, 2) || []
  }

  /**
   * Add connections between days
   */
  addConnections(plan) {
    for (let i = 1; i < plan.verses.length; i++) {
      const prev = plan.verses[i - 1]
      const curr = plan.verses[i]

      curr.connection = `From Day ${i}: ${prev.reference} showed us ${this.summarize(prev.text)}. Today builds on that foundation.`
    }
  }

  /**
   * Summarize verse text briefly
   */
  summarize(text) {
    // Simple summarization
    if (text.length < 50) return text
    return text.substring(0, 50) + '...'
  }

  /**
   * Generate plan overview
   */
  generateOverview(theme, days) {
    const overviews = {
      peace: `A ${days}-day journey from anxiety to the peace of God that guards your heart.`,
      hope: `A ${days}-day exploration of Christian hope—grounded, certain, and eternal.`,
      faith: `A ${days}-day walk through trusting God when you cannot see the outcome.`,
      love: `A ${days}-day immersion in God's love and its transformation of relationships.`,
      suffering: `A ${days}-day pilgrimage through pain to the God who meets us in it.`,
      redemption: `A ${days}-day celebration of salvation from fall to restoration.`,
      default: `A ${days}-day exploration of ${theme} through Scripture.`,
    }

    return overviews[theme] || overviews.default
  }

  /**
   * Generate plan instructions
   */
  generateInstructions(days) {
    return {
      daily: [
        'Read the verse slowly, twice.',
        'Note what stands out—words, phrases, emotions.',
        'Read the context provided.',
        'Answer the reflection questions.',
        'Pray the provided prayer.',
        'Commit to one application.',
      ],
      weekly:
        days >= 7
          ? [
              'Review all verses from the week on Day 7.',
              'Note patterns and connections.',
              'Share what you learned with someone.',
            ]
          : [],
      tips: [
        'Consistency matters more than length.',
        "It's okay to miss a day—just pick up where you left off.",
        'Write down insights in a journal.',
        'Memorize the Day 4 verse.',
      ],
    }
  }

  /**
   * Generate fallback plan when theme not found
   */
  generateFallbackPlan(days) {
    return {
      theme: 'general',
      days,
      verses: [],
      overview: `A ${days}-day journey through Scripture.`,
      instructions: this.generateInstructions(days),
      fallback: true,
    }
  }

  /**
   * Get devotional intensity (for ordering)
   */
  getDevotionalIntensity(verse) {
    // Simple heuristic: shorter verses are gentler
    return verse.text.length
  }

  /**
   * Get book order for canonical sorting
   */
  getBookOrder(reference) {
    const books = [
      'Genesis',
      'Exodus',
      'Leviticus',
      'Numbers',
      'Deuteronomy',
      'Joshua',
      'Judges',
      'Ruth',
      '1 Samuel',
      '2 Samuel',
      '1 Kings',
      '2 Kings',
      '1 Chronicles',
      '2 Chronicles',
      'Ezra',
      'Nehemiah',
      'Esther',
      'Job',
      'Psalms',
      'Proverbs',
      'Ecclesiastes',
      'Song of Solomon',
      'Isaiah',
      'Jeremiah',
      'Lamentations',
      'Ezekiel',
      'Daniel',
      'Hosea',
      'Joel',
      'Amos',
      'Obadiah',
      'Jonah',
      'Micah',
      'Nahum',
      'Habakkuk',
      'Zephaniah',
      'Haggai',
      'Zechariah',
      'Malachi',
      'Matthew',
      'Mark',
      'Luke',
      'John',
      'Acts',
      'Romans',
      '1 Corinthians',
      '2 Corinthians',
      'Galatians',
      'Ephesians',
      'Philippians',
      'Colossians',
      '1 Thessalonians',
      '2 Thessalonians',
      '1 Timothy',
      '2 Timothy',
      'Titus',
      'Philemon',
      'Hebrews',
      'James',
      '1 Peter',
      '2 Peter',
      '1 John',
      '2 John',
      '3 John',
      'Jude',
      'Revelation',
    ]

    const book = reference.split(' ')[0]
    return books.indexOf(book)
  }

  /**
   * Get chapter/verse number for sorting
   */
  getChapterVerse(reference) {
    const match = reference.match(/(\d+):(\d+)/)
    if (match) {
      return parseInt(match[1]) * 1000 + parseInt(match[2])
    }
    return 0
  }
}

module.exports = ReadingPlan
