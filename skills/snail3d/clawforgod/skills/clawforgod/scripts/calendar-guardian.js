/**
 * Calendar Guardian - Sabbath Time Blocking
 * Manages Sabbath time (Friday sunset to Saturday sunset)
 * Provides warnings and enforcement
 */

const EventEmitter = require('events')

class CalendarGuardian extends EventEmitter {
  constructor(config, logger) {
    super()
    this.config = config
    this.logger = logger
    this.interval = null
    this.lastState = null
    this.checkInterval = 5 * 60 * 1000 // Check every 5 minutes
  }

  start() {
    if (this.interval) {
      return
    }

    this.logger.info('Calendar Guardian started')

    // Initial check
    this.check()

    // Regular checks
    this.interval = setInterval(() => this.check(), this.checkInterval)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      this.logger.info('Calendar Guardian stopped')
    }
  }

  check() {
    if (!this.config.sabbathEnabled) {
      return
    }

    const state = this.getSabbathState()

    // State transitions
    if (!this.lastState || state.status !== this.lastState.status) {
      if (state.status === 'approaching') {
        this.emit('sabbath-approaching', {
          minutesUntil: state.minutesUntil,
        })
      } else if (state.status === 'active') {
        if (this.lastState?.status !== 'active') {
          this.emit('sabbath-time', {
            startTime: state.startTime,
          })
        }
      } else if (state.status === 'ending') {
        this.emit('sabbath-ending', {
          endTime: state.endTime,
        })
      }
    }

    this.lastState = state
  }

  /**
   * Get current Sabbath state
   * Returns: { status: 'normal'|'approaching'|'active'|'ending', minutesUntil, ... }
   */
  getSabbathState() {
    const now = new Date()
    const sabbathInfo = this.getSabbathTimes(now)

    const minutesUntilStart = (sabbathInfo.start - now) / (1000 * 60)
    const minutesUntilEnd = (sabbathInfo.end - now) / (1000 * 60)

    // Warning threshold: 120 minutes before Sabbath
    const warningThreshold = 120

    if (now >= sabbathInfo.start && now < sabbathInfo.end) {
      // Currently in Sabbath
      return {
        status: 'active',
        startTime: sabbathInfo.start,
        endTime: sabbathInfo.end,
      }
    } else if (minutesUntilStart >= 0 && minutesUntilStart <= warningThreshold) {
      // Approaching Sabbath
      return {
        status: 'approaching',
        minutesUntil: minutesUntilStart,
        startTime: sabbathInfo.start,
      }
    } else if (minutesUntilEnd > 0 && minutesUntilEnd <= 60) {
      // Ending soon
      return {
        status: 'ending',
        minutesUntil: minutesUntilEnd,
        endTime: sabbathInfo.end,
      }
    }

    return {
      status: 'normal',
    }
  }

  /**
   * Calculate Sabbath times (Friday sunset to Saturday sunset)
   * Uses astronomical sunset calculation
   */
  getSabbathTimes(date = new Date()) {
    // Simple approximation: Friday 18:00 to Saturday 18:00 (adjust for timezone)
    // A more sophisticated implementation would calculate actual sunset times

    const currentDay = date.getDay()
    const currentDate = date.getDate()
    const currentMonth = date.getMonth()
    const currentYear = date.getFullYear()

    // Calculate Friday this week
    const daysUntilFriday = (5 - currentDay + 7) % 7
    const fridayDate = new Date(currentYear, currentMonth, currentDate + daysUntilFriday)
    const sabbathStart = new Date(fridayDate)
    sabbathStart.setHours(18, 0, 0, 0) // Friday 6 PM

    // Saturday sunset
    const saturdayDate = new Date(sabbathStart)
    saturdayDate.setDate(saturdayDate.getDate() + 1)
    const sabbathEnd = new Date(saturdayDate)
    sabbathEnd.setHours(18, 0, 0, 0) // Saturday 6 PM

    // If we're past Saturday sunset, calculate for next week
    if (new Date() >= sabbathEnd) {
      sabbathStart.setDate(sabbathStart.getDate() + 7)
      sabbathEnd.setDate(sabbathEnd.getDate() + 7)
    }

    return {
      start: sabbathStart,
      end: sabbathEnd,
    }
  }

  /**
   * Check if current time is Sabbath
   */
  isSabbathTime(date = new Date()) {
    if (!this.config.sabbathEnabled) {
      return false
    }

    const sabbathTimes = this.getSabbathTimes(date)
    return date >= sabbathTimes.start && date < sabbathTimes.end
  }

  /**
   * Get minutes until Sabbath starts
   */
  getMinutesUntilSabbath(date = new Date()) {
    const sabbathTimes = this.getSabbathTimes(date)
    const minutesUntil = (sabbathTimes.start - date) / (1000 * 60)
    return Math.max(0, minutesUntil)
  }

  /**
   * Get minutes until Sabbath ends
   */
  getMinutesUntilSabbathEnds(date = new Date()) {
    const sabbathTimes = this.getSabbathTimes(date)
    const minutesUntil = (sabbathTimes.end - date) / (1000 * 60)
    return Math.max(0, minutesUntil)
  }

  /**
   * Format Sabbath times for display
   */
  formatSabbathTimes() {
    const sabbath = this.getSabbathTimes()
    return {
      start: sabbath.start.toLocaleString(),
      end: sabbath.end.toLocaleString(),
    }
  }
}

module.exports = CalendarGuardian
