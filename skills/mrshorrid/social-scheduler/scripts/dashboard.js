#!/usr/bin/env node

/**
 * Social Scheduler Web Dashboard
 * Simple HTTP server with HTML interface for managing scheduled posts
 */

const http = require('http')
const fs = require('fs').promises
const path = require('path')
const { Queue } = require('./queue.js')

const PORT = 3737 // OpenClaw Social Scheduler port
const queue = new Queue()

// Serve static HTML dashboard
async function serveDashboard(res) {
  try {
    const html = await fs.readFile(path.join(__dirname, 'dashboard.html'), 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Dashboard HTML not found')
  }
}

// API: Get all scheduled posts
async function getPosts(res) {
  try {
    await queue.ensureStorage()
    const pending = queue.getPending()
    const completed = queue.getCompleted()
    const failed = queue.getFailed()

    // Normalize field names for frontend (scheduledTime -> scheduledFor)
    const normalize = (posts) =>
      posts.map((p) => ({
        ...p,
        scheduledFor: p.scheduledTime || p.scheduledFor,
      }))

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        pending: normalize(pending).sort(
          (a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor),
        ),
        completed: normalize(completed).slice(-20).reverse(), // Last 20
        failed: normalize(failed).slice(-10).reverse(), // Last 10
      }),
    )
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}

// API: Cancel a scheduled post
async function cancelPost(req, res) {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', async () => {
    try {
      const { id } = JSON.parse(body)
      const cancelled = await queue.cancel(id)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: cancelled }))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
}

// API: Add a new scheduled post
async function addPost(req, res) {
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', async () => {
    try {
      const { platform, config, content, scheduledFor } = JSON.parse(body)

      // Validate required fields
      if (!platform || !config || !content || !scheduledFor) {
        throw new Error('Missing required fields')
      }

      // Add post to queue (using queue's add method signature)
      const post = queue.add({
        platform,
        content,
        config,
        scheduledTime: new Date(scheduledFor).toISOString(),
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, post }))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })
}

// API: Get platform info
async function getPlatforms(res) {
  const platforms = {
    discord: { name: 'Discord', authType: 'Webhook URL', charLimit: 2000 },
    reddit: { name: 'Reddit', authType: 'OAuth2', charLimit: 40000 },
    twitter: { name: 'Twitter/X', authType: 'OAuth 1.0a', charLimit: 280 },
    mastodon: { name: 'Mastodon', authType: 'Access Token', charLimit: 500 },
    bluesky: { name: 'Bluesky', authType: 'Handle + Password', charLimit: 300 },
    moltbook: { name: 'Moltbook', authType: 'API Key', charLimit: 5000 },
    linkedin: { name: 'LinkedIn', authType: 'OAuth 2.0', charLimit: 3000 },
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(platforms))
}

// Simple router
const server = http.createServer(async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = req.url

  // Routes
  if (url === '/' || url === '/dashboard') {
    await serveDashboard(res)
  } else if (url === '/api/posts' && req.method === 'GET') {
    await getPosts(res)
  } else if (url === '/api/posts' && req.method === 'POST') {
    await addPost(req, res)
  } else if (url === '/api/posts/cancel' && req.method === 'POST') {
    await cancelPost(req, res)
  } else if (url === '/api/platforms' && req.method === 'GET') {
    await getPlatforms(res)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`\n🎨 Social Scheduler Dashboard\n`)
  console.log(`   📡 Server running at: http://localhost:${PORT}`)
  console.log(`   🌐 Open in browser to manage scheduled posts\n`)
  console.log(`   Press Ctrl+C to stop\n`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down dashboard...\n')
  server.close(() => process.exit(0))
})
