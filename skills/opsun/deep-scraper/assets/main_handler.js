const { PlaywrightCrawler } = require('crawlee')

/**
 * Deep-Scraper: main_handler.js
 * Optimized for containerized execution in OpenClaw.
 *
 * Usage: node assets/main_handler.js [TARGET_URL]
 */

const targetUrl = process.argv[2]
const videoId = targetUrl?.split('v=')[1]?.split('&')[0]
const mode = targetUrl?.includes('youtube.com') ? 'YOUTUBE' : 'GENERIC'

if (!targetUrl) {
  console.error('Error: No target URL provided.')
  process.exit(1)
}

const crawler = new PlaywrightCrawler({
  launchContext: {
    launchOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Docker
    },
  },
  maxRequestRetries: 1,
  requestHandlerTimeoutSecs: 300,
  async requestHandler({ page, log }) {
    log.info(`Deep-Scraper starting in ${mode} mode for: ${targetUrl}`)

    // Clear context to ensure a fresh session (avoid cache leakage)
    const context = page.context()
    await context.clearCookies()

    if (mode === 'YOUTUBE') {
      let transcriptUrl = null

      // Network Interception for raw transcript API
      page.on('request', (request) => {
        const reqUrl = request.url()
        // Filter by Video ID to ensure matching data
        if (reqUrl.includes('youtube.com/api/timedtext') && reqUrl.includes(videoId)) {
          transcriptUrl = reqUrl
        }
      })

      await page.goto(targetUrl, { waitUntil: 'networkidle' })

      // Induce UI interaction to trigger hidden API requests
      try {
        const moreBtn = await page.waitForSelector('#expand, tp-yt-paper-button#expand', {
          timeout: 5000,
        })
        if (moreBtn) await moreBtn.click()
        await page.waitForTimeout(2000)
      } catch (e) {
        log.info('UI trigger failed, proceeding with network capture check...')
      }

      if (transcriptUrl) {
        // Fetch directly from intercepted API for 100% accuracy
        const xmlData = await page.evaluate(async (url) => {
          const resp = await fetch(url)
          return await resp.text()
        }, transcriptUrl)

        // Strip XML tags and clean whitespace
        const cleanText = xmlData
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        console.log(
          JSON.stringify({
            status: 'SUCCESS',
            type: 'TRANSCRIPT',
            videoId,
            data: cleanText.substring(0, 15000),
          }),
        )
      } else {
        // Fallback to video description if transcript is unavailable
        const desc = await page.evaluate(
          () => document.querySelector('#description-inline-expander')?.innerText || '',
        )
        console.log(
          JSON.stringify({
            status: 'PARTIAL',
            type: 'DESCRIPTION',
            videoId,
            data: desc,
          }),
        )
      }
    } else {
      // Generic dynamic page scraping
      await page.goto(targetUrl, { waitUntil: 'networkidle' })
      const title = await page.title()
      const content = await page.evaluate(() => document.body.innerText)
      console.log(
        JSON.stringify({
          status: 'SUCCESS',
          type: 'GENERIC',
          title,
          data: content.substring(0, 10000),
        }),
      )
    }
  },
})

crawler.run([targetUrl])
