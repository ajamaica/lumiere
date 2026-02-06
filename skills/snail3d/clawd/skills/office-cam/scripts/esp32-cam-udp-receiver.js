// esp32-cam-udp-receiver.js - Receives UDP photo broadcasts from ESP32 cameras
const dgram = require('dgram')
const fs = require('fs')
const path = require('path')

const UDP_PORT = 5556
const PHOTO_DIR = path.join(require('os').homedir(), '.clawdbot', 'media', 'cameras')

fs.mkdirSync(PHOTO_DIR, { recursive: true })

const server = dgram.createSocket('udp4')
let currentPhoto = null
let photoBuffer = null
let expectedChunks = 0
let receivedChunks = 0

server.on('message', (msg, rinfo) => {
  const data = msg.toString()

  // Check for control messages
  if (data.startsWith('START:')) {
    // New photo starting
    const parts = data.split(':')
    const size = parseInt(parts[1])
    expectedChunks = parseInt(parts[2])
    photoBuffer = Buffer.alloc(size)
    receivedChunks = 0
    currentPhoto = { size, chunks: expectedChunks, ip: rinfo.address }
    console.log(`[${rinfo.address}] Starting photo: ${size} bytes, ${expectedChunks} chunks`)
    return
  }

  if (data === 'END') {
    // Photo complete
    if (currentPhoto && photoBuffer) {
      const timestamp = Date.now()
      const filename = `cam-${rinfo.address.replace(/\./g, '-')}-${timestamp}.jpg`
      const filepath = path.join(PHOTO_DIR, filename)

      fs.writeFileSync(filepath, photoBuffer)
      console.log(`[${rinfo.address}] Photo saved: ${filename} (${photoBuffer.length} bytes)`)

      currentPhoto = null
      photoBuffer = null
    }
    return
  }

  if (data.startsWith('CAMERA:')) {
    // Camera announcement
    console.log(`[${rinfo.address}] ${data}`)
    return
  }

  // Data chunk
  if (currentPhoto && photoBuffer) {
    const offset = receivedChunks * 1400
    if (offset + msg.length <= photoBuffer.length) {
      msg.copy(photoBuffer, offset)
      receivedChunks++
      process.stdout.write('.')
    }
  }
})

server.on('listening', () => {
  const address = server.address()
  console.log(`📡 UDP Camera Receiver on port ${address.port}`)
  console.log(`📁 Photos: ${PHOTO_DIR}`)
  console.log('')
  console.log('Commands to trigger cameras:')
  console.log(`  echo "CAPTURE" | nc -u 192.168.1.255 ${UDP_PORT}`)
})

server.bind(UDP_PORT)

// Simple HTTP server to view photos
const express = require('express')
const httpApp = express()
const HTTP_PORT = 5557

httpApp.use('/photos', express.static(PHOTO_DIR))

httpApp.get('/', (req, res) => {
  const files = fs
    .readdirSync(PHOTO_DIR)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .reverse()

  let html = '<h1>📷 ESP32 UDP Cameras</h1>'
  html += `<p><a href="/trigger">Trigger All Cameras</a></p>`
  html += '<h2>Latest Photos:</h2>'

  for (const file of files.slice(0, 20)) {
    html += `<div style="margin:10px 0;">`
    html += `<p>${file}</p>`
    html += `<img src="/photos/${file}" width="640" style="max-width:100%">`
    html += `</div>`
  }

  res.send(html)
})

httpApp.get('/trigger', (req, res) => {
  // Send broadcast trigger
  const triggerMsg = Buffer.from('CAPTURE')
  server.send(triggerMsg, 0, triggerMsg.length, UDP_PORT, '192.168.1.255', (err) => {
    if (err) {
      res.send('Trigger failed: ' + err.message)
    } else {
      res.send('Trigger sent to all cameras! <a href="/">Back</a>')
    }
  })
})

httpApp.listen(HTTP_PORT, () => {
  console.log(`🌐 Photo viewer: http://localhost:${HTTP_PORT}`)
})
