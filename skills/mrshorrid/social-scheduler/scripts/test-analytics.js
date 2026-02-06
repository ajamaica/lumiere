// test-analytics.js - Test analytics tracking and reporting

const fs = require('fs').promises
const path = require('path')
const { logPost, getReport, formatReport, loadAnalytics } = require('./analytics')

const TEST_ANALYTICS_FILE = path.join(__dirname, '..', 'storage', 'analytics.json')

// Test helpers
let testsPassed = 0
let testsFailed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    testsPassed++
  } else {
    console.error(`  ❌ ${message}`)
    testsFailed++
  }
}

async function cleanup() {
  try {
    await fs.unlink(TEST_ANALYTICS_FILE)
  } catch {
    // File doesn't exist, that's fine
  }
}

// Tests
async function testLogPost() {
  console.log('\n📝 Testing logPost()...')

  await cleanup()

  // Log a successful post
  const post1 = {
    id: 'test-1',
    platform: 'twitter',
    scheduledTime: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
    success: true,
    media: ['image1.jpg'],
  }

  const log1 = await logPost(post1)
  assert(log1.id === 'test-1', 'Log entry has correct ID')
  assert(log1.success === true, 'Log entry marked as success')
  assert(log1.mediaCount === 1, 'Media count tracked')
  assert(typeof log1.delayMinutes === 'number', 'Delay calculated')

  // Log a failed post
  const post2 = {
    id: 'test-2',
    platform: 'discord',
    scheduledTime: new Date(Date.now() - 1 * 60000).toISOString(), // 1 min ago
    success: false,
    error: 'Network timeout',
  }

  const log2 = await logPost(post2)
  assert(log2.success === false, 'Failed post logged correctly')
  assert(log2.error === 'Network timeout', 'Error message captured')

  // Log a thread
  const post3 = {
    id: 'test-3',
    platform: 'twitter',
    scheduledTime: new Date(Date.now() - 2 * 60000).toISOString(),
    success: true,
    thread: ['Tweet 1', 'Tweet 2', 'Tweet 3'],
  }

  const log3 = await logPost(post3)
  assert(log3.isThread === true, 'Thread detected')
  assert(log3.threadLength === 3, 'Thread length tracked')
}

async function testAnalyticsSummary() {
  console.log('\n📊 Testing analytics summary...')

  const analytics = await loadAnalytics()

  assert(analytics.summary.totalPosts === 3, 'Total posts correct')
  assert(analytics.summary.successfulPosts === 2, 'Successful posts correct')
  assert(analytics.summary.failedPosts === 1, 'Failed posts correct')

  assert(analytics.summary.byPlatform.twitter, 'Twitter platform tracked')
  assert(analytics.summary.byPlatform.twitter.total === 2, 'Twitter total correct')
  assert(analytics.summary.byPlatform.twitter.successful === 2, 'Twitter successes correct')

  assert(analytics.summary.byPlatform.discord, 'Discord platform tracked')
  assert(analytics.summary.byPlatform.discord.failed === 1, 'Discord failures correct')

  assert(typeof analytics.summary.averageDelayMinutes === 'number', 'Average delay calculated')
}

async function testGetReport() {
  console.log('\n📈 Testing getReport()...')

  const report = await getReport({ days: 7 })

  assert(report.totalPosts === 3, 'Report shows correct total')
  assert(report.successfulPosts === 2, 'Report shows correct successes')
  assert(report.failedPosts === 1, 'Report shows correct failures')
  assert(report.successRate === '67%', 'Success rate calculated correctly')

  assert(Object.keys(report.byPlatform).length === 2, 'Platform breakdown included')
  assert(report.byPlatform.twitter.total === 2, 'Twitter stats correct in report')

  assert(report.threadStats.totalThreads === 1, 'Thread stats tracked')
  assert(report.threadStats.averageThreadLength === 3, 'Average thread length correct')

  assert(report.recentFailures.length === 1, 'Recent failures included')
  assert(report.recentFailures[0].platform === 'discord', 'Failure details correct')
}

async function testFormatReport() {
  console.log('\n🎨 Testing formatReport()...')

  const report = await getReport({ days: 7 })
  const formatted = formatReport(report)

  assert(typeof formatted === 'string', 'Report formatted as string')
  assert(formatted.includes('📊'), 'Report has emoji header')
  assert(formatted.includes('Total Posts: 3'), 'Report shows total posts')
  assert(formatted.includes('Success Rate: 67%'), 'Report shows success rate')
  assert(formatted.includes('twitter'), 'Report shows platform breakdown')
  assert(formatted.includes('Thread Stats'), 'Report shows thread stats')
  assert(formatted.includes('Recent Failures'), 'Report shows failures')
}

async function testPlatformFilter() {
  console.log('\n🔍 Testing platform filtering...')

  const twitterReport = await getReport({ days: 7, platform: 'twitter' })
  assert(twitterReport.totalPosts === 2, 'Twitter filter works')
  assert(twitterReport.successfulPosts === 2, 'Twitter successes filtered')

  const discordReport = await getReport({ days: 7, platform: 'discord' })
  assert(discordReport.totalPosts === 1, 'Discord filter works')
  assert(discordReport.failedPosts === 1, 'Discord failures filtered')
}

async function testDateRangeFilter() {
  console.log('\n📅 Testing date range filtering...')

  // All posts are recent (within last hour), so days=1 should include all
  const report1Day = await getReport({ days: 1 })
  assert(report1Day.totalPosts === 3, '1-day filter includes all recent posts')

  // 0 days should only include today
  const report0Days = await getReport({ days: 0 })
  assert(report0Days.totalPosts === 3, '0-day filter (today) includes all')
}

async function testMultipleDaysData() {
  console.log('\n🗓️ Testing multi-day analytics...')

  // Add a post from "yesterday" (simulate with older timestamp)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  await logPost({
    id: 'test-yesterday',
    platform: 'mastodon',
    scheduledTime: yesterday.toISOString(),
    success: true,
  })

  const report = await getReport({ days: 7 })
  assert(report.totalPosts === 4, 'Report includes older posts')
  assert(Object.keys(report.byDay).length >= 1, 'Daily breakdown tracks multiple days')
}

async function testEmptyAnalytics() {
  console.log('\n🔄 Testing empty analytics...')

  await cleanup()

  const report = await getReport({ days: 7 })
  assert(report.totalPosts === 0, 'Empty report shows zero posts')
  assert(report.successRate === '0%', 'Empty report shows 0% success rate')
  assert(report.threadStats.totalThreads === 0, 'Empty report shows zero threads')
}

// Run all tests
async function runTests() {
  console.log('🧪 Social Scheduler Analytics Tests\n')
  console.log('═'.repeat(50))

  try {
    await testLogPost()
    await testAnalyticsSummary()
    await testGetReport()
    await testFormatReport()
    await testPlatformFilter()
    await testDateRangeFilter()
    await testMultipleDaysData()
    await testEmptyAnalytics()

    // Cleanup after tests
    await cleanup()

    console.log('\n' + '═'.repeat(50))
    console.log(`\n✅ Tests passed: ${testsPassed}`)
    console.log(`❌ Tests failed: ${testsFailed}`)

    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed!\n')
      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed.\n')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

runTests()
