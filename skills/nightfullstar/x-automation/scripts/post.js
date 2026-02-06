#!/usr/bin/env node
/**
 * Post a tweet via browser automation
 * Usage: node scripts/post.js "Your tweet text"
 */

const { chromium } = require('playwright')

async function postTweet(text) {
  console.log('🐦 Connecting to browser...')

  // Connect to existing Chrome instance (OpenClaw browser)
  const browser = await chromium.connectOverCDP('http://127.0.0.1:18792')
  const context = browser.contexts()[0]
  const page = await context.newPage()

  try {
    console.log('📱 Opening X.com...')
    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle' })

    // Wait for compose box
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 })

    console.log('✍️  Typing tweet...')
    await page.fill('[data-testid="tweetTextarea_0"]', text)

    // Random human-like delay
    await page.waitForTimeout(1000 + Math.random() * 2000)

    console.log('📤 Posting...')
    await page.click('[data-testid="tweetButtonInline"]')

    // Wait for confirmation
    await page.waitForTimeout(3000)

    console.log('✅ Tweet posted successfully!')
  } catch (error) {
    console.error('❌ Error posting tweet:', error.message)
    throw error
  } finally {
    await page.close()
    await browser.close()
  }
}

// Get tweet text from command line
const tweetText = process.argv.slice(2).join(' ')

if (!tweetText) {
  console.error('Usage: node post.js "Your tweet text"')
  process.exit(1)
}

postTweet(tweetText)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
