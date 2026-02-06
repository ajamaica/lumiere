/**
 * Rest Guardian - Pattern-Based Rest Reminders
 *
 * Philosophy: Jesus IS the Sabbath (Matthew 11:28, Hebrews 4)
 * Rest is in Him, not a day. This tracks patterns and reminds about
 * both physical rest AND spiritual rest (resting in Jesus).
 */

const EventEmitter = require('events')

class RestGuardian extends EventEmitter {
  constructor(config, logger) {
    super()
    this.config = config
    this.logger = logger
    this.interval = null
    this.lastCheck = null
    this.checkInterval = 60 * 60 * 1000 // Check every hour

    // Track work patterns
    this.patternHistory = {
      consecutiveWorkDays: 0,
      lastRestDay: null,
      dailyActivity: [],
    }
  }

  start() {
    if (this.interval) {
      return
    }

    this.logger.info('Rest Guardian started')

    // Initial check
    this.check()

    // Regular checks
    this.interval = setInterval(() => this.check(), this.checkInterval)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      this.logger.info('Rest Guardian stopped')
    }
  }

  check() {
    this.analyzePatterns()

    const now = new Date()

    // Check for sustained work without rest
    if (this.patternHistory.consecutiveWorkDays >= 6) {
      this.emit('rest-needed', {
        type: 'consecutive-work',
        days: this.patternHistory.consecutiveWorkDays,
        message: `You've been going for ${this.patternHistory.consecutiveWorkDays} days straight. The Lord is your rest—have you been resting in Him?`,
        physicalRest: true,
        spiritualRest: true,
      })
    }

    // Check for late-night patterns
    const hour = now.getHours()
    if (hour >= 23 || hour <= 5) {
      this.emit('late-night-detected', {
        hour,
        message:
          'Late night again. Physical rest matters, but also—are you resting in Jesus, or just pushing through?',
      })
    }

    // Gentle daily check (not enforcement, just orientation)
    if (hour === 20 && this.isRestDay(now)) {
      this.emit('rest-reminder', {
        type: 'evening-rest',
        message:
          "Evening is here. However your day went, Jesus is your rest. Take a breath. He's already handled tomorrow.",
      })
    }

    this.lastCheck = now
  }

  /**
   * Analyze work/rest patterns
   */
  analyzePatterns() {
    // This would integrate with GitHub, activity logs, etc.
    // For now, placeholder that tracks based on external inputs

    const today = new Date().toDateString()

    // Check if today had significant activity
    const todayActivity = this.getTodayActivity()

    if (todayActivity > 0.5) {
      // Threshold for "work day"
      this.patternHistory.consecutiveWorkDays++
    } else {
      // Rest day detected
      this.patternHistory.consecutiveWorkDays = 0
      this.patternHistory.lastRestDay = today
    }

    // Keep last 30 days
    this.patternHistory.dailyActivity.push({
      date: today,
      activity: todayActivity,
    })

    if (this.patternHistory.dailyActivity.length > 30) {
      this.patternHistory.dailyActivity.shift()
    }
  }

  /**
   * Record activity for today (called by pattern-learner)
   */
  recordActivity(activityLevel) {
    const today = new Date().toDateString()
    const todayEntry = this.patternHistory.dailyActivity.find((d) => d.date === today)

    if (todayEntry) {
      todayEntry.activity = Math.max(todayEntry.activity, activityLevel)
    } else {
      this.patternHistory.dailyActivity.push({
        date: today,
        activity: activityLevel,
      })
    }
  }

  /**
   * Get today's activity level (0-1)
   */
  getTodayActivity() {
    const today = new Date().toDateString()
    const entry = this.patternHistory.dailyActivity.find((d) => d.date === today)
    return entry ? entry.activity : 0
  }

  /**
   * Check if today is a rest day (based on user's pattern, not a calendar)
   */
  isRestDay(date) {
    // User-defined rest day (could be any day)
    // Default: Sunday, but configurable
    const restDayOfWeek = this.config.restDayOfWeek || 0 // 0 = Sunday
    return date.getDay() === restDayOfWeek
  }

  /**
   * Get rest stats
   */
  getRestStats() {
    const totalDays = this.patternHistory.dailyActivity.length
    const restDays = this.patternHistory.dailyActivity.filter((d) => d.activity < 0.5).length
    const workDays = totalDays - restDays

    return {
      consecutiveWorkDays: this.patternHistory.consecutiveWorkDays,
      lastRestDay: this.patternHistory.lastRestDay,
      restDaysInLastMonth: restDays,
      workDaysInLastMonth: workDays,
      restRatio: totalDays > 0 ? restDays / totalDays : 0,
    }
  }

  /**
   * User reports taking rest
   */
  reportRest() {
    this.patternHistory.consecutiveWorkDays = 0
    this.patternHistory.lastRestDay = new Date().toDateString()

    this.emit('rest-acknowledged', {
      message:
        "Rest acknowledged. Whether physical rest or resting in Jesus—both matter. Hebrews 4:10 says we rest from our works. That's the goal.",
    })
  }
}

module.exports = RestGuardian
