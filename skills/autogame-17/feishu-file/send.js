#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

// Optimization: Use shared client and native FormData (Cycle #0061)
const { getToken, fetchWithRetry } = require('../common/feishu-client.js')

async function uploadFile(token, filePath) {
  const fileName = path.basename(filePath)
  const fileSize = fs.statSync(filePath).size

  // Validate size (30MB limit for IM API)
  if (fileSize > 30 * 1024 * 1024) {
    throw new Error(`File too large (${(fileSize / 1024 / 1024).toFixed(2)} MB). Max 30MB allowed.`)
  }

  console.log(`Uploading ${fileName} (${fileSize} bytes)...`)

  // Note: Node.js 18+ supports global FormData and Blob
  // fs.readFileSync returns Buffer. We can create a Blob from it.
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])

  const formData = new FormData()
  formData.append('file_type', 'stream') // 'stream' is typical for generic files
  formData.append('file_name', fileName)
  formData.append('file', blob, fileName)

  const res = await fetchWithRetry('https://open.feishu.cn/open-apis/im/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await res.json()

  if (data.code !== 0) {
    throw new Error(`Upload API Error ${data.code}: ${data.msg}`)
  }

  return data.data.file_key
}

async function sendFileMessage(target, filePath) {
  const token = await getToken()

  const fileKey = await uploadFile(token, filePath)
  console.log(`File uploaded. Key: ${fileKey}`)

  const receiveIdType = target.startsWith('oc_') ? 'chat_id' : 'open_id'

  const messageBody = {
    receive_id: target,
    msg_type: 'file',
    content: JSON.stringify({ file_key: fileKey }),
  }

  console.log(`Sending file message to ${target}...`)

  const res = await fetchWithRetry(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody),
    },
  )

  const data = await res.json()

  if (data.code !== 0) {
    throw new Error(`Send API Error ${data.code}: ${data.msg}`)
  }

  console.log('✅ Sent successfully!', data.data.message_id)
  return data.data
}

module.exports = { sendFileMessage, uploadFile }

if (require.main === module) {
  program
    .option('--target <id>', 'Target Chat/User ID')
    .option('--file <path>', 'File path')
    .parse(process.argv)

  const options = program.opts()

  ;(async () => {
    if (!options.target || !options.file) {
      console.error('Usage: node send.js --target <id> --file <path>')
      process.exit(1)
    }

    const filePath = path.resolve(options.file)
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath)
      process.exit(1)
    }

    try {
      await sendFileMessage(options.target, filePath)
    } catch (e) {
      console.error('Error:', e.message)
      process.exit(1)
    }
  })()
}
