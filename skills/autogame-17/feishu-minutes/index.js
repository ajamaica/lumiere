const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { getTenantAccessToken } = require('./lib/auth')
const fetch = require('node-fetch')

async function apiRequest(url, method = 'GET', body = null) {
  const token = await getTenantAccessToken()
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  const data = await res.json()

  if (data.code !== 0) {
    throw new Error(`API Error ${data.code}: ${data.msg}`)
  }
  return data.data
}

// 1. Get Info
async function getInfo(token) {
  console.log(`Fetching Info for ${token}...`)
  const url = `https://open.feishu.cn/open-apis/minutes/v1/minutes/${token}`
  return await apiRequest(url)
}

// 2. Get Statistics
async function getStats(token) {
  console.log(`Fetching Stats for ${token}...`)
  const url = `https://open.feishu.cn/open-apis/minutes/v1/minutes/${token}/statistics`
  return await apiRequest(url)
}

// 3. Get Subtitle (Transcript)
async function getSubtitle(token) {
  console.log(`Fetching Subtitle for ${token}...`)
  const url = `https://open.feishu.cn/open-apis/minutes/v1/minutes/${token}/subtitle`
  return await apiRequest(url)
}

// 4. Download Media (Video/Audio)
// Note: The 'info' endpoint usually returns the 'url' (video link).
// If separate API needed, we'll explore. But usually 'url' in info is the playback/download link.
async function downloadMedia(url, destPath) {
  console.log(`Downloading Media from ${url}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`)

  const fileStream = fs.createWriteStream(destPath)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('finish', resolve)
  })
  console.log(`Saved to ${destPath}`)
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .command('process <token>', 'Process a Minutes token (Info, Stats, Subtitle, Download)', {
      out: { alias: 'o', type: 'string', description: 'Output directory' },
    })
    .demandCommand(1)
    .help().argv

  const command = argv._[0]
  const token = argv.token || argv._[1]
  const outDir = argv.out
    ? path.resolve(argv.out)
    : path.resolve(__dirname, '../../memory/feishu_minutes', token)

  if (!token) {
    console.error('Token required!')
    return
  }

  if (command === 'process') {
    try {
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

      // 1. Info
      const info = await getInfo(token)
      fs.writeFileSync(path.join(outDir, 'info.json'), JSON.stringify(info, null, 2))
      console.log(`Info saved.`)

      // 2. Stats
      try {
        const stats = await getStats(token)
        fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2))
        console.log(`Stats saved.`)
      } catch (e) {
        console.error(`Stats failed: ${e.message}`)
      }

      // 3. Subtitle
      try {
        const subtitle = await getSubtitle(token)
        fs.writeFileSync(path.join(outDir, 'subtitle.json'), JSON.stringify(subtitle, null, 2))

        // Convert to Markdown
        let md = `# ${info.minute?.basic_info?.topic || 'Minutes'}\n\n`
        if (subtitle.paragraphs) {
          subtitle.paragraphs.forEach((p) => {
            const time = new Date(p.start_time).toISOString().substr(11, 8)
            const speaker = p.speaker || 'Unknown'
            const text = p.sentences.map((s) => s.content).join(' ')
            md += `**[${time}] ${speaker}:** ${text}\n\n`
          })
        }
        fs.writeFileSync(path.join(outDir, 'transcript.md'), md)
        console.log(`Subtitle saved & converted.`)
      } catch (e) {
        console.error(`Subtitle failed: ${e.message}`)
      }

      // 4. Download Media
      // Note: The API 'url' might be the web player URL, not raw file.
      // Official docs say `GET /minutes/{token}` returns `video_url` (downloadable).
      // Let's check `info` structure.
      const videoUrl = info.minute?.basic_info?.video_url || info.video_url
      if (videoUrl) {
        const ext = 'mp4' // Default to mp4
        await downloadMedia(videoUrl, path.join(outDir, `media.${ext}`))
      } else {
        console.warn('No video_url found in Info response.')
      }

      console.log(`\n✅ All Done! Output: ${outDir}`)
    } catch (e) {
      console.error(`Error: ${e.message}`)
    }
  }
}

main()
