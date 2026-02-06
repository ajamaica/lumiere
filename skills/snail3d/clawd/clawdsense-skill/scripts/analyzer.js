#!/usr/bin/env node

/**
 * ClawdSense Analyzer
 * Real-time polling + Groq vision API for instant image analysis
 * Polls ~/.clawdbot/media/inbound/ every 500ms for new photos
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const mediaDir = path.join(process.env.HOME, '.clawdbot/media/inbound')
const GROQ_API_KEY =
  process.env.GROQ_API_KEY || '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'

// Track analyzed files to avoid duplicates
const analyzedFiles = new Set()

/**
 * Send image to Groq Vision API for analysis
 */
async function analyzeWithGroq(imagePath) {
  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(imagePath)
    const base64 = imageData.toString('base64')

    const payload = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: 'Analyze this office photo. Who is present? What are they doing? Describe the environment.',
            },
          ],
        },
      ],
    }

    const postData = JSON.stringify(payload)

    const options = {
      hostname: 'api.groq.com',
      port: 443,
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content)
          } else if (json.error) {
            reject(new Error(`Groq API: ${json.error.message}`))
          } else {
            reject(new Error(`Unexpected response: ${JSON.stringify(json)}`))
          }
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

/**
 * Poll directory for new photos
 */
function startPolling() {
  console.log(`📷 Polling ${mediaDir} every 500ms for new photos...\n`)

  // Get initial files
  try {
    fs.readdirSync(mediaDir)
      .filter((f) => f.match(/\.(jpg|jpeg)$/i))
      .forEach((f) => analyzedFiles.add(f))
  } catch (e) {
    console.error('Error reading directory:', e.message)
  }

  // Poll every 500ms
  setInterval(async () => {
    try {
      const files = fs.readdirSync(mediaDir).filter((f) => f.match(/\.(jpg|jpeg)$/i))

      for (const file of files) {
        if (analyzedFiles.has(file)) continue

        analyzedFiles.add(file)
        const filePath = path.join(mediaDir, file)
        const stats = fs.statSync(filePath)

        console.log(`📸 New photo: ${file} (${stats.size} bytes)`)
        console.log(`⏳ Analyzing with Groq Vision...`)

        try {
          const result = await analyzeWithGroq(filePath)
          console.log(`✅ Result:\n${result}\n`)
          console.log(`${'='.repeat(60)}\n`)
        } catch (error) {
          console.error(`❌ Error: ${error.message}\n`)
        }
      }
    } catch (e) {
      // Ignore errors, keep polling
    }
  }, 500)
}

// Start
startPolling()
console.log(`🚀 ClawdSense Analyzer ready.\n`)

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})
