#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { program } = require('commander')
const { Readable } = require('stream')
const { finished } = require('stream/promises')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

// Optimization: Use shared client (Cycle #0060)
const { getToken, fetchWithRetry } = require('../common/feishu-client.js')

async function downloadFile(fileKey, outputPath, messageId) {
  const token = await getToken()
  console.log(`Getting file ${fileKey} (msg: ${messageId})...`)

  // Auto-detect type
  const type = fileKey.startsWith('img_') ? 'image' : 'file'
  const url = `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}/resources/${fileKey}?type=${type}`

  // Use fetchWithRetry (handles 429 and retries)
  // Note: fetchWithRetry returns a Response object
  const res = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'openclaw-downloader/1.0',
    },
  })

  // Handle stream
  const fileStream = fs.createWriteStream(outputPath)

  // Node.js 18+ fetch body is a ReadableStream (Web API)
  // We need to convert it to Node stream or pipe directly if supported
  // Readable.fromWeb(res.body) converts Web Stream to Node Stream

  if (!res.body) throw new Error('Response body is empty')

  const nodeStream = Readable.fromWeb(res.body)

  await finished(nodeStream.pipe(fileStream))
  console.log(`✅ Downloaded to ${outputPath}`)
  return outputPath
}

// Export for module usage
module.exports = { downloadFile }

if (require.main === module) {
  program
    .argument('<file_key>', 'File Key')
    .argument('<output_path>', 'Output Path')
    .argument('<message_id>', 'Message ID')
    .action(async (fileKey, output, msgId) => {
      try {
        await downloadFile(fileKey, output, msgId)
      } catch (e) {
        console.error(`Download failed: ${e.message}`)
        // Clean up partial file
        if (fs.existsSync(output)) {
          try {
            fs.unlinkSync(output)
          } catch (e) {}
        }
        process.exit(1)
      }
    })

  program.parse()
}
