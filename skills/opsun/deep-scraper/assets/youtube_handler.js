const { PlaywrightCrawler } = require('crawlee')

const targetUrl = process.argv[2]
const videoId = targetUrl.split('v=')[1]?.split('&')[0]

const crawler = new PlaywrightCrawler({
  launchContext: {
    launchOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  maxRequestRetries: 1,
  requestHandlerTimeoutSecs: 300,
  async requestHandler({ page, log }) {
    log.info(`正在尝试强制抓取视频内容 (ID: ${videoId}): ${targetUrl}`)

    let transcriptUrl = null

    // 监听所有网络请求
    page.on('request', (request) => {
      const reqUrl = request.url()
      // 只要包含 timedtext 且包含当前 videoId 的请求都捕获
      if (reqUrl.includes('youtube.com/api/timedtext') && reqUrl.includes(videoId)) {
        log.info(`截获成功: ${reqUrl}`)
        transcriptUrl = reqUrl
      }
    })

    // 1. 彻底清除缓存和 Cookie 确保全新加载
    const context = page.context()
    await context.clearCookies()

    // 2. 访问页面并等待
    await page.goto(targetUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(5000)

    // 3. 强制触发：展开描述栏并寻找“转录稿”按钮
    try {
      const moreBtn = await page.waitForSelector('#expand, tp-yt-paper-button#expand', {
        timeout: 10000,
      })
      await moreBtn.click()
      await page.waitForTimeout(2000)

      // 在描述栏里暴力寻找按钮
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, ytd-button-renderer'))
        const target = btns.find(
          (b) => b.innerText.includes('转录') || b.innerText.includes('Transcript'),
        )
        if (target) {
          target.scrollIntoView()
          target.click()
        }
      })
      log.info('已尝试点击触发按钮')
      await page.waitForTimeout(5000)
    } catch (e) {
      log.info('UI 触发失败，继续观察网络流量...')
    }

    // 4. 如果还没拿到，尝试开启 CC
    if (!transcriptUrl) {
      try {
        await page.click('.ytp-subtitles-button')
        log.info('已尝试点击 CC 按钮')
        await page.waitForTimeout(5000)
      } catch (e) {}
    }

    if (transcriptUrl) {
      const xmlData = await page.evaluate(async (apiUrl) => {
        const resp = await fetch(apiUrl)
        return await resp.text()
      }, transcriptUrl)

      // 增强清理逻辑
      const cleanText = xmlData
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      console.log('--- 深度抓取成功 (ID 校验通过) ---')
      console.log(
        JSON.stringify(
          {
            videoId,
            transcript: cleanText.substring(0, 15000),
          },
          null,
          2,
        ),
      )
    } else {
      // 终极备选方案：直接抓取页面可见的描述文字
      const description = await page.evaluate(
        () => document.querySelector('#description-inline-expander')?.innerText || '',
      )
      console.log('--- 字幕抓取失败，返回描述信息 ---')
      console.log(JSON.stringify({ videoId, description }, null, 2))
    }
  },
})

crawler.run([targetUrl])
