#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const https = require('https')

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadDotEnv()

function getEnv(name, fallback) {
  return process.env[name] || fallback
}

function getBaseUrl() {
  const base = getEnv('CONFLUENCE_BASE_URL')
  if (!base) throw new Error('CONFLUENCE_BASE_URL is required')
  return base.replace(/\/$/, '')
}

function getAuthHeaders() {
  const method = (getEnv('CONFLUENCE_AUTH_METHOD', 'basic') || 'basic').toLowerCase()
  if (method === 'oauth') {
    const token = getEnv('CONFLUENCE_OAUTH_TOKEN')
    if (!token) throw new Error('CONFLUENCE_OAUTH_TOKEN is required for oauth')
    return { Authorization: `Bearer ${token}` }
  }
  const email = getEnv('CONFLUENCE_EMAIL')
  const token = getEnv('CONFLUENCE_API_TOKEN')
  if (!email || !token)
    throw new Error('CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN required for basic auth')
  const basic = Buffer.from(`${email}:${token}`).toString('base64')
  return { Authorization: `Basic ${basic}` }
}

function normalizeError(statusCode, data) {
  let message = data
  try {
    const obj = JSON.parse(data)
    message = obj.message || obj.error || JSON.stringify(obj)
  } catch (_) {}
  return `HTTP ${statusCode}: ${message}`
}

function request(method, apiPath, body) {
  const base = getBaseUrl()
  const url = new URL(`/wiki/api/v2${apiPath}`, base)
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  }
  if (getEnv('CONFLUENCE_ADMIN_KEY') === 'true') {
    headers['Atl-Confluence-With-Admin-Key'] = 'true'
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(normalizeError(res.statusCode, data)))
        }
        resolve(data ? JSON.parse(data) : {})
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function requestAll(apiPath, params = {}) {
  let cursor
  let items = []
  do {
    const url = new URL(apiPath, 'https://dummy')
    if (params.limit) url.searchParams.set('limit', params.limit)
    if (cursor) url.searchParams.set('cursor', cursor)
    const res = await request('GET', url.pathname + url.search)
    if (Array.isArray(res.results)) items = items.concat(res.results)
    cursor = res?._links?.next
      ? new URL(res._links.next, 'https://dummy').searchParams.get('cursor')
      : null
  } while (cursor)
  return items
}

module.exports = { request, requestAll }
