#!/usr/bin/env node

/**
 * ClawdSense Media Receiver
 * Accepts multipart/form-data POS from ClawdSense firmware
 * Stores media in ~/.clawdbot/media/inbound/ for Clawdbot analysis
 */

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const app = express()
const PORT = process.env.PORT || 5555

// Media storage directory
const mediaDir = path.join(process.env.HOME, '.clawdbot/media/inbound')
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || `.${file.mimetype.split('/')[1]}`
    const name = uuidv4()
    cb(null, name + ext)
  },
})

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

/**
 * POST /inbound/photo
 * Receives: device, chat_id, caption, photo (JPEG file)
 */
app.post('/inbound/photo', upload.single('photo'), (req, res) => {
  const { device, chat_id, caption } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No photo file provided' })
  }

  console.log(`📸 Photo received from ${device || 'unknown'}`)
  console.log(`   File: ${req.file.filename}`)
  console.log(`   Size: ${req.file.size} bytes`)
  if (caption) console.log(`   Caption: ${caption}`)

  res.json({
    status: 'received',
    filename: req.file.filename,
    size: req.file.size,
    path: req.file.path,
  })
})

/**
 * POST /inbound/audio
 * Receives: device, chat_id, duration_ms, audio (WAV file)
 */
app.post('/inbound/audio', upload.single('audio'), (req, res) => {
  const { device, chat_id, duration_ms } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' })
  }

  console.log(`🎤 Audio received from ${device || 'unknown'}`)
  console.log(`   File: ${req.file.filename}`)
  console.log(`   Size: ${req.file.size} bytes`)
  if (duration_ms) console.log(`   Duration: ${duration_ms}ms`)

  res.json({
    status: 'received',
    filename: req.file.filename,
    size: req.file.size,
    path: req.file.path,
  })
})

/**
 * POST /inbound/video
 * Receives: device, chat_id, duration_ms, video (AVI file)
 */
app.post('/inbound/video', upload.single('video'), (req, res) => {
  const { device, chat_id, duration_ms } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' })
  }

  console.log(`🎬 Video received from ${device || 'unknown'}`)
  console.log(`   File: ${req.file.filename}`)
  console.log(`   Size: ${req.file.size} bytes`)
  if (duration_ms) console.log(`   Duration: ${duration_ms}ms`)

  res.json({
    status: 'received',
    filename: req.file.filename,
    size: req.file.size,
    path: req.file.path,
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mediaDir })
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ClawdSense Media Receiver running on port ${PORT}`)
  console.log(`📁 Media storage: ${mediaDir}\n`)
  console.log(`Endpoints:`)
  console.log(`  POST http://localhost:${PORT}/inbound/photo`)
  console.log(`  POST http://localhost:${PORT}/inbound/audio`)
  console.log(`  POST http://localhost:${PORT}/inbound/video`)
  console.log(`  GET  http://localhost:${PORT}/health\n`)
  console.log(`To expose publicly: ngrok http ${PORT}\n`)
})
