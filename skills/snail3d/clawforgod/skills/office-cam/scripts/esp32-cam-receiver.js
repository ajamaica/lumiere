// esp32-cam-receiver.js - Central photo receiver for multiple ESP32 cameras
// Run this on your Mac: node esp32-cam-receiver.js

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 5555
const PHOTO_DIR = path.join(require('os').homedir(), '.clawdbot', 'media', 'cameras')

// Ensure directory exists
fs.mkdirSync(PHOTO_DIR, { recursive: true })

// Store latest photos from each camera
const cameraPhotos = new Map()

// Receive photos from ESP32 cameras
app.post('/capture', express.raw({ type: 'image/jpeg', limit: '5mb' }), (req, res) => {
  const deviceId = req.headers['x-device-id'] || 'unknown'
  const timestamp = Date.now()
  const filename = `${deviceId}-${timestamp}.jpg`
  const filepath = path.join(PHOTO_DIR, filename)

  fs.writeFileSync(filepath, req.body)
  cameraPhotos.set(deviceId, {
    path: filepath,
    timestamp: timestamp,
    url: `/photos/${filename}`,
  })

  console.log(`[${new Date().toISOString()}] Photo from ${deviceId}: ${req.body.length} bytes`)
  res.send('OK')
})

// List all cameras and their latest photos
app.get('/cameras', (req, res) => {
  const cameras = {}
  for (const [id, data] of cameraPhotos) {
    cameras[id] = {
      lastSeen: data.timestamp,
      age: Math.round((Date.now() - data.timestamp) / 1000),
      photo: data.url,
    }
  }
  res.json({ cameras, count: cameraPhotos.size })
})

// Get latest photo from specific camera
app.get('/camera/:id/photo', (req, res) => {
  const data = cameraPhotos.get(req.params.id)
  if (!data) return res.status(404).send('Camera not found')
  res.sendFile(data.path)
})

// Get latest photo from specific camera (redirect)
app.get('/camera/:id', (req, res) => {
  res.redirect(`/camera/${req.params.id}/photo`)
})

// Web interface - view all cameras
app.get('/', (req, res) => {
  let html = '<h1>🏠 ESP32 Camera Network</h1>'
  html += '<p><a href="/cameras">JSON Status</a></p>'
  html += '<h2>Cameras:</h2>'

  if (cameraPhotos.size === 0) {
    html += '<p>No cameras connected yet.</p>'
  } else {
    for (const [id, data] of cameraPhotos) {
      const age = Math.round((Date.now() - data.timestamp) / 1000)
      html += `<div style="margin:20px 0; padding:10px; border:1px solid #ccc;">`
      html += `<h3>${id}</h3>`
      html += `<p>Last photo: ${age}s ago</p>`
      html += `<img src="${data.url}" width="640" style="max-width:100%">`
      html += `</div>`
    }
  }

  html += '<hr><p>Refresh to update</p>'
  res.send(html)
})

// Serve photos
app.use('/photos', express.static(PHOTO_DIR))

// Trigger specific camera to capture
app.post('/trigger/:id', async (req, res) => {
  // This would require the camera to have a command endpoint
  // For now, cameras auto-capture or capture on their own schedule
  res.json({ status: 'Cameras auto-capture every 30s or on boot' })
})

app.listen(PORT, () => {
  console.log(`🎥 ESP32 Camera Receiver running on port ${PORT}`)
  console.log(`📁 Photos saved to: ${PHOTO_DIR}`)
  console.log(`🌐 Open: http://localhost:${PORT}`)
  console.log('')
  console.log('Camera firmware should POST to:')
  console.log(`  http://YOUR_MAC_IP:${PORT}/capture`)
})
