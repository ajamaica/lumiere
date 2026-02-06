#!/usr/bin/env node
const fs = require('fs')
const { program } = require('commander')
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')
const { parseFile } = require('music-metadata')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

if (!APP_ID || !APP_SECRET) {
  console.error('Error: FEISHU_APP_ID or FEISHU_APP_SECRET not set.')
  process.exit(1)
}

// Reuse token logic
async function getToken() {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
      const now = Math.floor(Date.now() / 1000)
      if (cached.expire > now + 60) return cached.token
    }
  } catch (e) {}

  try {
    const res = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: APP_ID,
        app_secret: APP_SECRET,
      },
    )
    const data = res.data
    if (!data.tenant_access_token) throw new Error(`No token returned: ${JSON.stringify(data)}`)

    try {
      const cacheData = {
        token: data.tenant_access_token,
        expire: Math.floor(Date.now() / 1000) + data.expire,
      }
      fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cacheData, null, 2))
    } catch (e) {
      console.error('Failed to cache token:', e.message)
    }

    return data.tenant_access_token
  } catch (e) {
    console.error('Failed to get token:', e.message)
    process.exit(1)
  }
}

async function uploadAudio(token, filePath, durationMs) {
  const fileSize = fs.statSync(filePath).size
  const fileStream = fs.createReadStream(filePath)

  const form = new FormData()
  form.append('file_type', 'opus') // 'opus' triggers voice bubble handling in Feishu
  form.append('file_name', path.basename(filePath))
  // Feishu upload API usually takes duration in header or extra field for audio?
  // Actually for 'opus' type, some docs say it detects.
  // But let's check if we can pass it.
  form.append('duration', durationMs)
  form.append('file', fileStream)

  try {
    const res = await axios.post('https://open.feishu.cn/open-apis/im/v1/files', form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    })

    if (res.data.code !== 0) throw new Error(`Upload Error ${res.data.code}: ${res.data.msg}`)
    return res.data.data.file_key
  } catch (e) {
    console.error('Upload Failed:', e.response ? e.response.data : e.message)
    throw e
  }
}

async function sendAudio(options) {
  const token = await getToken()

  if (!fs.existsSync(options.file)) {
    console.error(`File not found: ${options.file}`)
    process.exit(1)
  }

  // 1. Get Duration
  let durationMs = options.duration
  if (!durationMs) {
    try {
      const metadata = await parseFile(options.file)
      if (metadata.format.duration) {
        durationMs = Math.round(metadata.format.duration * 1000)
        console.log(`Detected duration: ${durationMs}ms`)
      } else {
        console.warn('Could not detect duration. Using default 1000ms.')
        durationMs = 1000
      }
    } catch (e) {
      console.warn(`Duration detection failed: ${e.message}. Using default 1000ms.`)
      durationMs = 1000
    }
  }

  // 2. Upload
  console.log(`Uploading ${options.file} as opus...`)
  let fileKey
  try {
    fileKey = await uploadAudio(token, options.file, durationMs)
  } catch (e) {
    process.exit(1)
  }

  // 3. Send
  let receiveIdType = 'open_id'
  if (options.target.startsWith('oc_')) receiveIdType = 'chat_id'
  else if (options.target.startsWith('ou_')) receiveIdType = 'open_id'
  else if (options.target.includes('@')) receiveIdType = 'email'

  const messageBody = {
    receive_id: options.target,
    msg_type: 'audio',
    content: JSON.stringify({ file_key: fileKey }),
  }

  console.log(`Sending Audio Bubble to ${options.target}...`)

  try {
    const res = await axios.post(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
      messageBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (res.data.code !== 0) {
      throw new Error(`API Error ${res.data.code}: ${res.data.msg}`)
    }

    console.log('Success:', JSON.stringify(res.data.data, null, 2))
  } catch (e) {
    console.error('Send Failed:', e.response ? e.response.data : e.message)
    process.exit(1)
  }
}

program
  .requiredOption('-t, --target <id>', 'Target ID')
  .requiredOption('-f, --file <path>', 'Audio file path')
  .option('-d, --duration <ms>', 'Duration in ms (optional, auto-detected if omitted)')

program.parse(process.argv)
const options = program.opts()

;(async () => {
  sendAudio(options)
})()
