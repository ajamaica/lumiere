/**
 * Pattern Learner - GitHub Activity Monitoring
 * Tracks commit patterns, late-night work, Sabbath violations
 * Learns user's natural work rhythm
 */

const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')

class PatternLearner extends EventEmitter {
  constructor(config, logger) {
    super()
    this.config = config
    this.logger = logger
    this.interval = null
    this.activity = []
    this.checkInterval = (config.githubCheckInterval || 15) * 60 * 1000 // Default 15 minutes
    this.dataFile = path.join(__dirname, '..', 'data', 'activity.json')

    this.ensureDataDir()
    this.loadActivity()
  }

  ensureDataDir() {
    const dir = path.dirname(this.dataFile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  loadActivity() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'))
        this.activity = data || []
      }
    } catch (e) {
      this.logger.warn(`Failed to load activity: ${e.message}`)
      this.activity = []
    }
  }

  saveActivity() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.activity, null, 2))
    } catch (e) {
      this.logger.warn(`Failed to save activity: ${e.message}`)
    }
  }

  start() {
    if (this.interval) {
      return
    }

    if (!this.config.githubToken) {
      this.logger.warn('GitHub token not configured. Pattern learning disabled.')
      return
    }

    this.logger.info('Pattern Learner started')

    // Initial check
    this.check()

    // Regular checks
    this.interval = setInterval(() => this.check(), this.checkInterval)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      this.logger.info('Pattern Learner stopped')
    }
  }

  async check() {
    try {
      const commits = await this.fetchRecentCommits()
      this.analyzeActivity(commits)
    } catch (e) {
      this.logger.error(`Pattern learning check failed: ${e.message}`)
    }
  }

  /**
   * Fetch recent commits from GitHub
   */
  async fetchRecentCommits() {
    if (!this.config.githubToken || !this.config.githubUsername) {
      return []
    }

    try {
      const response = await fetch(
        `https://api.github.com/users/${this.config.githubUsername}/events`,
        {
          headers: {
            Authorization: `Bearer ${this.config.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      )

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const events = await response.json()
      const commits = events
        .filter((e) => e.type === 'PushEvent')
        .slice(0, 10) // Last 10 pushes
        .map((e) => ({
          id: e.id,
          timestamp: new Date(e.created_at),
          repo: e.repo.name,
          size: e.payload.size,
        }))

      return commits
    } catch (e) {
      this.logger.error(`Failed to fetch GitHub commits: ${e.message}`)
      return []
    }
  }

  /**
   * Analyze activity patterns
   */
  analyzeActivity(recentCommits) {
    // Add recent commits to history
    recentCommits.forEach((commit) => {
      const exists = this.activity.some((a) => a.id === commit.id)
      if (!exists) {
        this.activity.push(commit)
      }
    })

    // Keep last 7 days of activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    this.activity = this.activity.filter((a) => new Date(a.timestamp) > sevenDaysAgo)

    this.saveActivity()

    // Analyze patterns
    const patterns = this.analyzePatterns()
    this.emitAlerts(patterns)
  }

  /**
   * Analyze patterns in activity
   */
  analyzePatterns() {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const thisWeek = this.activity.filter(
      (a) => new Date(a.timestamp) >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    )

    const lateNightCommits = this.findLateNightCommits(thisWeek)
    const earlyMorningCommits = this.findEarlyMorningCommits(thisWeek)
    const weekendWork = this.findWeekendWork(thisWeek)
    const overallTrend = this.calculateWorkTrend(thisWeek)

    return {
      lateNightCount: lateNightCommits.length,
      earlyMorningCount: earlyMorningCommits.length,
      weekendWorkDays: weekendWork.length,
      overallTrend,
      commits: thisWeek,
    }
  }

  /**
   * Find commits after 11 PM
   */
  findLateNightCommits(commits) {
    const threshold = parseInt(this.config.lateNightThreshold?.split(':')[0] || '23', 10)

    return commits.filter((commit) => {
      const hour = new Date(commit.timestamp).getHours()
      return hour >= threshold || hour < 6 // After 11 PM or before 6 AM
    })
  }

  /**
   * Find commits before 6 AM
   */
  findEarlyMorningCommits(commits) {
    const threshold = parseInt(this.config.earlyMorningThreshold?.split(':')[0] || '6', 10)

    return commits.filter((commit) => {
      const hour = new Date(commit.timestamp).getHours()
      return hour < threshold && hour >= 0
    })
  }

  /**
   * Find weekend work
   */
  findWeekendWork(commits) {
    return commits.filter((commit) => {
      const day = new Date(commit.timestamp).getDay()
      return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
    })
  }

  /**
   * Calculate overall work trend
   */
  calculateWorkTrend(commits) {
    if (commits.length === 0) {
      return 'stable'
    }

    // Count commits by day
    const dailyCounts = {}
    commits.forEach((c) => {
      const day = new Date(c.timestamp).toDateString()
      dailyCounts[day] = (dailyCounts[day] || 0) + 1
    })

    const days = Object.values(dailyCounts)
    if (days.length < 2) {
      return 'stable'
    }

    // Simple trend: compare last 3 days to previous 3 days
    const recentAvg = days.slice(-3).reduce((a, b) => a + b, 0) / 3
    const priorAvg = days.slice(-6, -3).reduce((a, b) => a + b, 0) / 3

    if (recentAvg > priorAvg * 1.5) {
      return 'increasing'
    } else if (recentAvg < priorAvg * 0.67) {
      return 'decreasing'
    }

    return 'stable'
  }

  /**
   * Emit alerts for detected patterns
   */
  emitAlerts(patterns) {
    // Late night commits
    if (patterns.lateNightCount >= 2) {
      this.emit('unusual-activity', {
        type: 'late-night-commits',
        count: patterns.lateNightCount,
        suggestion: "Late-night work is unsustainable. Let's talk about what's driving it.",
      })
    }

    // Weekend work
    if (patterns.weekendWorkDays > 0) {
      this.emit('unusual-activity', {
        type: 'weekend-work',
        count: patterns.weekendWorkDays,
        suggestion: 'I notice weekend work. Your rhythm matters too.',
      })
    }

    // Increasing trend + high activity
    if (patterns.overallTrend === 'increasing' && patterns.commits.length > 20) {
      this.emit('burnout-warning', {
        reason: "Your activity is increasing significantly. Make sure you're taking breaks.",
        pattern: 'increasing',
      })
    }
  }

  /**
   * Get activity summary
   */
  getSummary() {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weekActivity = this.activity.filter((a) => new Date(a.timestamp) > week)

    return {
      totalCommits: weekActivity.length,
      avgPerDay: (weekActivity.length / 7).toFixed(1),
      lateNightCommits: this.findLateNightCommits(weekActivity).length,
      weekendDays: this.findWeekendWork(weekActivity).length,
      trend: this.calculateWorkTrend(weekActivity),
    }
  }
}

module.exports = PatternLearner
