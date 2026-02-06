// analytics.js - Post analytics and performance tracking
// Tracks success rates, timing accuracy, engagement metrics

const fs = require('fs').promises
const path = require('path')

const ANALYTICS_FILE = path.join(__dirname, '..', 'storage', 'analytics.json')

// Initialize analytics storage
async function initAnalytics() {
  try {
    await fs.access(ANALYTICS_FILE)
  } catch {
    const initialData = {
      posts: [],
      summary: {
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        byPlatform: {},
        byDay: {},
        averageDelayMinutes: 0,
      },
      lastUpdated: new Date().toISOString(),
    }
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(initialData, null, 2))
  }
}

// Load analytics data
async function loadAnalytics() {
  await initAnalytics()
  const data = await fs.readFile(ANALYTICS_FILE, 'utf8')
  return JSON.parse(data)
}

// Save analytics data
async function saveAnalytics(data) {
  data.lastUpdated = new Date().toISOString()
  await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2))
}

// Log a post attempt
async function logPost(postData) {
  const analytics = await loadAnalytics()

  const logEntry = {
    id: postData.id,
    platform: postData.platform,
    scheduledTime: postData.scheduledTime,
    actualTime: new Date().toISOString(),
    success: postData.success,
    error: postData.error || null,
    mediaCount: postData.media?.length || 0,
    isThread: postData.thread?.length > 1 || false,
    threadLength: postData.thread?.length || 1,
  }

  // Calculate delay (scheduled vs actual)
  const scheduled = new Date(postData.scheduledTime)
  const actual = new Date(logEntry.actualTime)
  const delayMinutes = Math.round((actual - scheduled) / 60000)
  logEntry.delayMinutes = delayMinutes

  analytics.posts.push(logEntry)

  // Update summary
  analytics.summary.totalPosts++
  if (postData.success) {
    analytics.summary.successfulPosts++
  } else {
    analytics.summary.failedPosts++
  }

  // Update platform stats
  if (!analytics.summary.byPlatform[postData.platform]) {
    analytics.summary.byPlatform[postData.platform] = {
      total: 0,
      successful: 0,
      failed: 0,
    }
  }
  analytics.summary.byPlatform[postData.platform].total++
  if (postData.success) {
    analytics.summary.byPlatform[postData.platform].successful++
  } else {
    analytics.summary.byPlatform[postData.platform].failed++
  }

  // Update daily stats
  const day = actual.toISOString().split('T')[0]
  if (!analytics.summary.byDay[day]) {
    analytics.summary.byDay[day] = {
      total: 0,
      successful: 0,
      failed: 0,
    }
  }
  analytics.summary.byDay[day].total++
  if (postData.success) {
    analytics.summary.byDay[day].successful++
  } else {
    analytics.summary.byDay[day].failed++
  }

  // Calculate average delay
  const totalDelay = analytics.posts.reduce((sum, p) => sum + (p.delayMinutes || 0), 0)
  analytics.summary.averageDelayMinutes = Math.round(totalDelay / analytics.posts.length)

  await saveAnalytics(analytics)
  return logEntry
}

// Get analytics report
async function getReport(options = {}) {
  const analytics = await loadAnalytics()
  const { days = 7, platform = null } = options

  // Filter by date range
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  let posts = analytics.posts.filter((p) => {
    const postDate = new Date(p.actualTime)
    return postDate >= cutoffDate
  })

  // Filter by platform
  if (platform) {
    posts = posts.filter((p) => p.platform === platform)
  }

  // Calculate stats
  const totalPosts = posts.length
  const successfulPosts = posts.filter((p) => p.success).length
  const failedPosts = posts.filter((p) => !p.success).length
  const successRate = totalPosts > 0 ? Math.round((successfulPosts / totalPosts) * 100) : 0

  const totalDelay = posts.reduce((sum, p) => sum + (p.delayMinutes || 0), 0)
  const averageDelay = totalPosts > 0 ? Math.round(totalDelay / totalPosts) : 0

  // Platform breakdown
  const byPlatform = {}
  posts.forEach((p) => {
    if (!byPlatform[p.platform]) {
      byPlatform[p.platform] = { total: 0, successful: 0, failed: 0 }
    }
    byPlatform[p.platform].total++
    if (p.success) {
      byPlatform[p.platform].successful++
    } else {
      byPlatform[p.platform].failed++
    }
  })

  // Daily breakdown
  const byDay = {}
  posts.forEach((p) => {
    const day = p.actualTime.split('T')[0]
    if (!byDay[day]) {
      byDay[day] = { total: 0, successful: 0, failed: 0 }
    }
    byDay[day].total++
    if (p.success) {
      byDay[day].successful++
    } else {
      byDay[day].failed++
    }
  })

  // Recent failures
  const recentFailures = posts
    .filter((p) => !p.success)
    .slice(-10)
    .map((p) => ({
      platform: p.platform,
      time: p.actualTime,
      error: p.error,
    }))

  return {
    period: `Last ${days} days`,
    totalPosts,
    successfulPosts,
    failedPosts,
    successRate: `${successRate}%`,
    averageDelayMinutes: averageDelay,
    byPlatform,
    byDay,
    recentFailures,
    threadStats: {
      totalThreads: posts.filter((p) => p.isThread).length,
      averageThreadLength:
        posts.filter((p) => p.isThread).length > 0
          ? Math.round(
              posts.filter((p) => p.isThread).reduce((sum, p) => sum + p.threadLength, 0) /
                posts.filter((p) => p.isThread).length,
            )
          : 0,
    },
  }
}

// Export report to formatted text
function formatReport(report) {
  let output = `📊 Social Scheduler Analytics - ${report.period}\n\n`

  output += `📈 Overview:\n`
  output += `  Total Posts: ${report.totalPosts}\n`
  output += `  ✅ Successful: ${report.successfulPosts}\n`
  output += `  ❌ Failed: ${report.failedPosts}\n`
  output += `  Success Rate: ${report.successRate}\n`
  output += `  ⏱️  Average Delay: ${report.averageDelayMinutes} minutes\n\n`

  if (Object.keys(report.byPlatform).length > 0) {
    output += `🌐 By Platform:\n`
    Object.entries(report.byPlatform).forEach(([platform, stats]) => {
      const rate = Math.round((stats.successful / stats.total) * 100)
      output += `  ${platform}: ${stats.total} posts (${rate}% success)\n`
    })
    output += '\n'
  }

  if (report.threadStats.totalThreads > 0) {
    output += `🧵 Thread Stats:\n`
    output += `  Total Threads: ${report.threadStats.totalThreads}\n`
    output += `  Average Length: ${report.threadStats.averageThreadLength} posts\n\n`
  }

  if (Object.keys(report.byDay).length > 0) {
    output += `📅 Daily Activity:\n`
    Object.entries(report.byDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .forEach(([day, stats]) => {
        output += `  ${day}: ${stats.total} posts (${stats.successful} ✅, ${stats.failed} ❌)\n`
      })
    output += '\n'
  }

  if (report.recentFailures.length > 0) {
    output += `⚠️  Recent Failures:\n`
    report.recentFailures.forEach((f) => {
      const time = new Date(f.time).toLocaleString()
      output += `  ${f.platform} - ${time}\n`
      output += `    Error: ${f.error}\n`
    })
  }

  return output
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'report') {
    const days = parseInt(args[1]) || 7
    const platform = args[2] || null

    getReport({ days, platform })
      .then((report) => {
        console.log(formatReport(report))
      })
      .catch((err) => {
        console.error('❌ Error generating report:', err.message)
        process.exit(1)
      })
  } else if (command === 'export') {
    const days = parseInt(args[1]) || 30
    const outputFile = args[2] || 'analytics-report.txt'

    getReport({ days })
      .then((report) => {
        const formatted = formatReport(report)
        return fs.writeFile(outputFile, formatted)
      })
      .then(() => {
        console.log(`✅ Report exported to ${outputFile}`)
      })
      .catch((err) => {
        console.error('❌ Error exporting report:', err.message)
        process.exit(1)
      })
  } else if (command === 'raw') {
    loadAnalytics()
      .then((data) => {
        console.log(JSON.stringify(data, null, 2))
      })
      .catch((err) => {
        console.error('❌ Error loading analytics:', err.message)
        process.exit(1)
      })
  } else {
    console.log(`
📊 Social Scheduler Analytics

Usage:
  node analytics.js report [days] [platform]  - View analytics report
  node analytics.js export [days] [file]      - Export report to file
  node analytics.js raw                       - View raw analytics data

Examples:
  node analytics.js report 7           - Last 7 days (all platforms)
  node analytics.js report 30 twitter  - Last 30 days (Twitter only)
  node analytics.js export 7 report.txt - Export 7-day report
    `)
  }
}

module.exports = {
  logPost,
  getReport,
  formatReport,
  loadAnalytics,
}
