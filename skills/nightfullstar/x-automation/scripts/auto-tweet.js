#!/usr/bin/env node
/**
 * Auto-tweet generator with approval flow
 * 1. Fetch trending topics
 * 2. Generate tweet ideas
 * 3. Save to approval queue
 *
 * Usage: node scripts/auto-tweet.js
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function getTrends() {
  console.log('🔥 Fetching trending topics...')

  const browser = await chromium.connectOverCDP('http://127.0.0.1:18792')
  const context = browser.contexts()[0]
  const page = await context.newPage()

  try {
    await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="trend"]', { timeout: 10000 })

    const trends = await page.evaluate(() => {
      const trendElements = document.querySelectorAll('[data-testid="trend"]')
      return Array.from(trendElements)
        .slice(0, 10)
        .map((el) => {
          const nameEl = el.querySelector('[dir="ltr"]')
          const tweetCountEl = el.querySelector('span:last-child')

          return {
            topic: nameEl ? nameEl.textContent : 'Unknown',
            tweets: tweetCountEl ? tweetCountEl.textContent : '0',
          }
        })
    })

    await page.close()
    await browser.close()

    return trends
  } catch (error) {
    console.error('❌ Error fetching trends:', error.message)
    throw error
  }
}

async function main() {
  try {
    const trends = await getTrends()

    console.log(`📊 Found ${trends.length} trending topics`)

    // Save trends for AI to process
    const dataDir = path.join(__dirname, '..', 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const trendsFile = path.join(dataDir, 'latest-trends.json')
    fs.writeFileSync(
      trendsFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          trends,
        },
        null,
        2,
      ),
    )

    console.log(`💾 Saved trends to ${trendsFile}`)
    console.log('\n🤖 Now message OpenClaw to generate tweet ideas from these trends!')

    // Output trends for easy reading
    console.log('\nTop trends:')
    trends.slice(0, 5).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.topic} (${t.tweets})`)
    })
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
