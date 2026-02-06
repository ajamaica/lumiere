const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

program
  .option('--image-key <key>', 'Image Key')
  .option('--output <path>', 'Output file path')
  .allowExcessArguments(true)
  .parse(process.argv)

const options = program.opts()
const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET

async function getTenantAccessToken() {
  try {
    const res = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: APP_ID,
        app_secret: APP_SECRET,
      },
      { timeout: 10000 },
    )
    return res.data.tenant_access_token
  } catch (e) {
    console.error('Failed to get token:', e.message)
    process.exit(1)
  }
}

async function downloadImage(token, imageKey, outputPath) {
  console.log(`Downloading Image ${imageKey}...`)

  // Ensure directory exists
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const writer = fs.createWriteStream(outputPath)
  const url = `https://open.feishu.cn/open-apis/im/v1/images/${imageKey}`

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 60000,
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      let errorReceived = false

      writer.on('finish', () => {
        if (!errorReceived) {
          console.log(`✅ Downloaded to ${outputPath}`)
          resolve()
        }
      })

      writer.on('error', (err) => {
        errorReceived = true
        console.error('File write error:', err.message)
        writer.close()
        reject(err)
      })

      response.data.on('error', (err) => {
        errorReceived = true
        console.error('Stream download error:', err.message)
        writer.close()
        reject(err)
      })
    })
  } catch (e) {
    writer.close()
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)

    if (e.response) {
      console.error(`Download failed: HTTP ${e.response.status} ${e.response.statusText}`)
      try {
        const chunks = []
        for await (const chunk of e.response.data) {
          chunks.push(chunk)
        }
        const msg = Buffer.concat(chunks).toString()
        try {
          const json = JSON.parse(msg)
          console.error('API Error:', JSON.stringify(json, null, 2))
        } catch {
          console.error('Error Body:', msg.substring(0, 500))
        }
      } catch (readErr) {}
    } else {
      console.error('Network/System Error:', e.message)
    }
    throw e
  }
}

async function run() {
  if (!options.imageKey || !options.output) {
    console.error('Usage: node download_image.js --image-key <key> --output <path>')
    process.exit(1)
  }

  try {
    const token = await getTenantAccessToken()
    await downloadImage(token, options.imageKey, options.output)
  } catch (e) {
    console.error('❌ Download Failed')
    process.exit(1)
  }
}

run()
