#!/usr/bin/env node
/**
 * Scrape trending topics from X
 * Usage: node scripts/trends.js
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function getTrendingTopics() {
  console.log('🔥 Fetching trending topics...')

  const browser = await chromium.connectOverCDP('http://127.0.0.1:18792')
  const context = browser.contexts()[0]
  const page = await context.newPage()

  try {
    await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle' })

    // Wait for trends to load
    await page.waitForSelector('[data-testid="trend"]', { timeout: 10000 })

    // Extract trending topics
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
            timestamp: new Date().toISOString(),
          }
        })
    })

    console.log(`📊 Found ${trends.length} trending topics:`)
    trends.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.topic} (${t.tweets})`)
    })

    // Save to file
    const dataDir = path.join(__dirname, '..', 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const filename = path.join(dataDir, `trends-${Date.now()}.json`)
    fs.writeFileSync(filename, JSON.stringify(trends, null, 2))

    console.log(`💾 Saved to ${filename}`)

    return trends
  } catch (error) {
    console.error('❌ Error fetching trends:', error.message)
    throw error
  } finally {
    await page.close()
    await browser.close()
  }
}

getTrendingTopics()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
