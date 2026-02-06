#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

// Optimization: Remove SDK, use shared client + caching (Cycle #0063)
const { getToken, fetchWithRetry } = require('../common/feishu-client.js')

const IMAGE_KEY_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_image_keys.json')

async function uploadImage(token, filePath) {
  // 1. Check Cache
  let fileBuffer
  try {
    fileBuffer = fs.readFileSync(filePath)
  } catch (e) {
    throw new Error(`Read file failed: ${e.message}`)
  }

  const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex')

  let cache = {}
  if (fs.existsSync(IMAGE_KEY_CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(IMAGE_KEY_CACHE_FILE, 'utf8'))
    } catch (e) {}
  }

  if (cache[fileHash]) {
    console.log(`Using cached image key (Hash: ${fileHash.substring(0, 8)})`)
    return cache[fileHash]
  }

  // 2. Upload
  console.log(`Uploading image: ${path.basename(filePath)}...`)

  const formData = new FormData()
  formData.append('image_type', 'message')
  const blob = new Blob([fileBuffer])
  formData.append('image', blob, path.basename(filePath))

  const res = await fetchWithRetry('https://open.feishu.cn/open-apis/im/v1/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await res.json()
  if (data.code !== 0) throw new Error(`Upload API Error ${data.code}: ${data.msg}`)

  const imageKey = data.data.image_key

  // 3. Update Cache
  cache[fileHash] = imageKey
  try {
    const cacheDir = path.dirname(IMAGE_KEY_CACHE_FILE)
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(IMAGE_KEY_CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch (e) {}

  return imageKey
}

async function sendImageMessage(target, filePath) {
  const token = await getToken()
  const imageKey = await uploadImage(token, filePath)

  const receiveIdType = target.startsWith('oc_') ? 'chat_id' : 'open_id'

  const messageBody = {
    receive_id: target,
    msg_type: 'image',
    content: JSON.stringify({ image_key: imageKey }),
  }

  console.log(`Sending image message to ${target}...`)

  const res = await fetchWithRetry(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody),
    },
  )

  const data = await res.json()
  if (data.code !== 0) throw new Error(`Send API Error ${data.code}: ${data.msg}`)

  console.log('✅ Sent successfully!', data.data.message_id)
  return data.data
}

module.exports = { sendImageMessage, uploadImage }

if (require.main === module) {
  program
    .option('--target <id>', 'Target Chat/User ID')
    .option('--image <path>', 'Image file path')
    .parse(process.argv)

  const options = program.opts()

  ;(async () => {
    if (!options.target || !options.image) {
      console.error('Usage: node send.js --target <id> --image <path>')
      process.exit(1)
    }

    const filePath = path.resolve(options.image)
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath)
      process.exit(1)
    }

    try {
      await sendImageMessage(options.target, filePath)
    } catch (e) {
      console.error('Error:', e.message)
      process.exit(1)
    }
  })()
}
