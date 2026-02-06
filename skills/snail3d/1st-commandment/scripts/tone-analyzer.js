/**
 * Tone Analyzer - Message Stress Detection
 * Analyzes message text for indicators of stress, anger, burnout
 * Detects urgency, frustration, harshness
 */

const EventEmitter = require('events')

class ToneAnalyzer extends EventEmitter {
  constructor(config, logger) {
    super()
    this.config = config
    this.logger = logger

    this.stressPatterns = {
      // Urgency indicators
      urgency: [
        /\basap\b/i,
        /\bneed.*now\b/i,
        /\bimmediately\b/i,
        /\memergency\b/i,
        /\bhave to\b/i,
        /\bmust\b/i,
        /\bcan't wait\b/i,
      ],

      // All caps (shouting)
      shouting: /[A-Z]{4,}/,

      // Excessive punctuation
      excessive: [/!{2,}/, /\?{2,}/, /\.{3,}/],

      // Harsh/negative language
      harsh: [
        /\bstupid\b/i,
        /\bdumb\b/i,
        /\buseless\b/i,
        /\bfailed\b/i,
        /\bworse\b/i,
        /\bdevastated\b/i,
        /\bdevastating\b/i,
        /\bterrible\b/i,
        /\bawful\b/i,
      ],

      // Complaint patterns
      complaint: [
        /why\s+can't/i,
        /why\s+didn't/i,
        /\bso frustrated\b/i,
        /\bso angry\b/i,
        /\bcan't handle\b/i,
        /\bcan't do\b/i,
      ],

      // Self-deprecation
      selfDeprecation: [
        /\bi'm.*sorry\b/i,
        /\bmy.*fault\b/i,
        /\bi.*messed up\b/i,
        /\bi'm.*useless\b/i,
        /\bi'm.*terrible\b/i,
      ],

      // Burnout indicators
      burnout: [
        /\bso tired\b/i,
        /\bso exhausted\b/i,
        /\bcan't take\b/i,
        /\bso done\b/i,
        /\bgive up\b/i,
      ],
    }
  }

  /**
   * Analyze a message for tone
   */
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return {
        isStressed: false,
        indicators: [],
        severity: 0,
      }
    }

    const indicators = this.detectIndicators(text)
    const severity = this.calculateSeverity(indicators)
    const isStressed = severity >= 10 - (10 - this.config.stressSensitivity || 7)

    if (isStressed) {
      this.logger.info(`Stress detected (severity: ${severity}): ${indicators.join(', ')}`)
    }

    return {
      isStressed,
      indicators,
      severity,
      text: text.substring(0, 200), // Store first 200 chars for logging
    }
  }

  /**
   * Detect stress indicators in text
   */
  detectIndicators(text) {
    const indicators = []

    // Check urgency
    if (this.matchPatterns(text, this.stressPatterns.urgency)) {
      indicators.push('urgency_language')
    }

    // Check shouting
    if (this.stressPatterns.shouting.test(text)) {
      const allCapsWords = text.match(/\b[A-Z]{4,}\b/g) || []
      if (allCapsWords.length >= 2) {
        indicators.push('all_caps')
      }
    }

    // Check excessive punctuation
    if (this.matchPatterns(text, this.stressPatterns.excessive)) {
      indicators.push('excessive_punctuation')
    }

    // Check harsh language
    if (this.matchPatterns(text, this.stressPatterns.harsh)) {
      indicators.push('harsh_language')
    }

    // Check complaints
    if (this.matchPatterns(text, this.stressPatterns.complaint)) {
      indicators.push('complaint_pattern')
    }

    // Check self-deprecation
    if (this.matchPatterns(text, this.stressPatterns.selfDeprecation)) {
      indicators.push('self_deprecation')
    }

    // Check burnout indicators
    if (this.matchPatterns(text, this.stressPatterns.burnout)) {
      indicators.push('burnout_language')
    }

    // Check rapid messaging (heuristic: long text with many short sentences)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim())
    if (sentences.length > 5 && sentences.every((s) => s.split(' ').length < 5)) {
      indicators.push('rapid_messaging')
    }

    return indicators
  }

  /**
   * Check if text matches any patterns in a group
   */
  matchPatterns(text, patterns) {
    return patterns.some((pattern) => {
      if (pattern instanceof RegExp) {
        return pattern.test(text)
      }
      return false
    })
  }

  /**
   * Calculate stress severity (0-10)
   */
  calculateSeverity(indicators) {
    if (indicators.length === 0) {
      return 0
    }

    let severity = 0

    const weights = {
      urgency_language: 2,
      all_caps: 3,
      excessive_punctuation: 2,
      harsh_language: 3,
      complaint_pattern: 2,
      self_deprecation: 3,
      burnout_language: 4,
      rapid_messaging: 2,
    }

    indicators.forEach((indicator) => {
      severity += weights[indicator] || 1
    })

    return Math.min(10, severity)
  }

  /**
   * Categorize stress type
   */
  categorizeStress(indicators) {
    if (indicators.includes('urgent_language') || indicators.includes('urgency_language')) {
      return 'urgency'
    }

    if (indicators.includes('harsh_language') || indicators.includes('complaint_pattern')) {
      return 'anger'
    }

    if (indicators.includes('burnout_language') || indicators.includes('self_deprecation')) {
      return 'burnout'
    }

    return 'general_stress'
  }

  /**
   * Get suggested verse topic for detected stress
   */
  getSuggestedVerseTopic(indicators) {
    const stressType = this.categorizeStress(indicators)

    const topicMap = {
      urgency: 'rest',
      anger: 'anger',
      burnout: 'rest',
      general_stress: 'stress',
    }

    return topicMap[stressType] || 'stress'
  }
}

module.exports = ToneAnalyzer
