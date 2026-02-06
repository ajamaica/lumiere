#!/usr/bin/env node
/**
 * Verse Matcher - Match Events to Scripture
 *
 * Matches current events to relevant Bible verses using
 * thematic mappings and theological connections.
 */

const fs = require('fs')
const path = require('path')

class VerseMatcher {
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
      return { themes: {}, event_mappings: {} }
    }
  }

  /**
   * Match event to verses
   */
  match(event, options = {}) {
    const { type, context, severity } = event

    // Get themes for this event type
    const themes = this.getThemesForEvent(type)

    // Score and rank verses from these themes
    const scoredVerses = []

    for (const theme of themes) {
      const themeData = this.verses.themes[theme]
      if (!themeData) continue

      for (const verse of themeData.verses || []) {
        const score = this.scoreVerse(verse, event, context)
        scoredVerses.push({ verse, score, theme })
      }
    }

    // Sort by score
    scoredVerses.sort((a, b) => b.score - a.score)

    // Return top matches
    const topMatches = scoredVerses.slice(0, options.limit || 3)

    return topMatches.map((m) => ({
      ...m.verse,
      theme: m.theme,
      relevanceScore: m.score,
      connection: this.generateConnection(m.verse, event),
    }))
  }

  /**
   * Get themes for an event type
   */
  getThemesForEvent(eventType) {
    const mappings = this.verses.event_mappings || {}

    // Direct match
    if (mappings[eventType]) {
      return mappings[eventType]
    }

    // Fuzzy match
    for (const [key, themes] of Object.entries(mappings)) {
      if (eventType.includes(key) || key.includes(eventType)) {
        return themes
      }
    }

    // Default themes
    return ['hope', 'faith', 'peace']
  }

  /**
   * Score a verse for relevance to an event
   */
  scoreVerse(verse, event, context) {
    let score = 0

    // Event type match
    if (verse.events?.includes(event.type)) {
      score += 5
    }

    // Context keywords match
    if (context) {
      const contextLower = context.toLowerCase()

      if (verse.text.toLowerCase().includes(contextLower)) {
        score += 3
      }
      if (verse.context.toLowerCase().includes(contextLower)) {
        score += 2
      }
    }

    // Severity boost
    if (event.severity === 'high') {
      // Prefer hope/comfort verses for severe events
      if (verse.events?.includes('hope') || verse.events?.includes('comfort')) {
        score += 2
      }
    }

    return score
  }

  /**
   * Generate connection explanation
   */
  generateConnection(verse, event) {
    let connection = verse.theology || ''

    if (event.type) {
      connection += ` This speaks to ${event.type} because `

      if (verse.events?.includes(event.type)) {
        connection += 'it directly addresses this situation.'
      } else if (verse.events?.includes('hope')) {
        connection += 'it offers hope in difficult circumstances.'
      } else {
        connection += 'it provides eternal perspective.'
      }
    }

    return connection
  }

  /**
   * Find verses by theme
   */
  findByTheme(theme, options = {}) {
    const themeData = this.verses.themes[theme]
    if (!themeData) return []

    let verses = themeData.verses || []

    // Shuffle if requested
    if (options.random) {
      verses = [...verses].sort(() => Math.random() - 0.5)
    }

    // Limit
    if (options.limit) {
      verses = verses.slice(0, options.limit)
    }

    return verses
  }

  /**
   * Find verses by keyword
   */
  findByKeyword(keyword) {
    const matches = []
    const lowerKeyword = keyword.toLowerCase()

    for (const [themeName, themeData] of Object.entries(this.verses.themes || {})) {
      for (const verse of themeData.verses || []) {
        let score = 0

        if (verse.text.toLowerCase().includes(lowerKeyword)) score += 3
        if (verse.context.toLowerCase().includes(lowerKeyword)) score += 2
        if (verse.theology.toLowerCase().includes(lowerKeyword)) score += 2
        if (verse.reference.toLowerCase().includes(lowerKeyword)) score += 1

        if (score > 0) {
          matches.push({ verse, score, theme: themeName })
        }
      }
    }

    matches.sort((a, b) => b.score - a.score)
    return matches.map((m) => m.verse)
  }

  /**
   * Get cross-references for a verse
   */
  getCrossReferences(verse, options = {}) {
    const refs = []

    // Find verses with shared events
    for (const event of verse.events || []) {
      for (const [themeName, themeData] of Object.entries(this.verses.themes || {})) {
        for (const v of themeData.verses || []) {
          if (v.id === verse.id) continue

          if (v.events?.includes(event)) {
            refs.push({
              reference: v.reference,
              text: v.text,
              sharedEvent: event,
            })
          }

          if (refs.length >= (options.limit || 3)) break
        }
        if (refs.length >= (options.limit || 3)) break
      }
      if (refs.length >= (options.limit || 3)) break
    }

    return refs
  }
}

module.exports = VerseMatcher
