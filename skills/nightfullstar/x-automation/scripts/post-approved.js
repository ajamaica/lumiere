#!/usr/bin/env node
/**
 * Post approved tweets from queue
 * Usage: node scripts/post-approved.js
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function postTweet(text) {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:18792')
  const context = browser.contexts()[0]
  const page = await context.newPage()

  try {
    console.log(`📱 Posting: "${text.substring(0, 50)}..."`)

    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 })

    await page.fill('[data-testid="tweetTextarea_0"]', text)

    // Human-like delay
    await page.waitForTimeout(1000 + Math.random() * 2000)

    await page.click('[data-testid="tweetButtonInline"]')
    await page.waitForTimeout(3000)

    console.log('✅ Posted successfully!')

    await page.close()
    await browser.close()

    return true
  } catch (error) {
    console.error('❌ Error posting:', error.message)
    await page.close()
    await browser.close()
    return false
  }
}

async function main() {
  const queueFile = path.join(__dirname, '..', 'data', 'approved-queue.json')

  if (!fs.existsSync(queueFile)) {
    console.log('📭 No approved tweets in queue')
    return
  }

  const queue = JSON.parse(fs.readFileSync(queueFile, 'utf8'))

  if (queue.length === 0) {
    console.log('📭 Queue is empty')
    return
  }

  console.log(`📬 Found ${queue.length} approved tweets to post`)

  for (const tweet of queue) {
    const success = await postTweet(tweet.text)

    if (success) {
      tweet.posted = true
      tweet.postedAt = new Date().toISOString()
    }

    // Wait 30-60 seconds between tweets to look human
    if (queue.indexOf(tweet) < queue.length - 1) {
      const delay = 30000 + Math.random() * 30000
      console.log(`⏳ Waiting ${Math.round(delay / 1000)}s before next tweet...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Save posted tweets to history
  const historyFile = path.join(__dirname, '..', 'data', 'tweet-history.json')
  let history = []

  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
  }

  history.push(...queue)
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2))

  // Clear queue
  fs.writeFileSync(queueFile, JSON.stringify([], null, 2))

  console.log('🎉 All tweets posted!')
}

main()
