#!/usr/bin/env node
import { readFileSync } from 'node:fs'

import { request } from 'undici'

const API_BASE = (process.env.VESTABOARD_API_BASE || 'https://cloud.vestaboard.com/').replace(
  /\/+$/,
  '/',
)

// Preferred auth (Cloud API)
const TOKEN = process.env.VESTABOARD_TOKEN
// Legacy auth (rw.vestaboard.com header)
const RW_KEY = process.env.VESTABOARD_RW_KEY

function usage() {
  console.error('Usage: vb.js <read|preview|write|write-layout> <text-or-path?>')
  process.exit(2)
}

function authHeaders() {
  if (TOKEN) return { 'X-Vestaboard-Token': TOKEN }
  if (RW_KEY) return { 'X-Vestaboard-Read-Write-Key': RW_KEY }
  return null
}

function normalizeText(s) {
  return String(s ?? '').toUpperCase()
}

function wrapToLines(text, width = 22, height = 6) {
  const t = normalizeText(text).replace(/\s+/g, ' ').trim()
  if (!t) return Array.from({ length: height }, () => ' '.repeat(width))

  const words = t.split(' ')
  const lines = []
  let line = ''

  const pushLine = (s) => {
    lines.push(s.padEnd(width, ' '))
  }

  for (let w of words) {
    while (w.length > width) {
      // hard wrap long word
      const chunk = w.slice(0, width)
      w = w.slice(width)
      if (line) {
        pushLine(line)
        line = ''
      }
      pushLine(chunk)
      if (lines.length >= height) return lines.slice(0, height)
    }

    const candidate = line ? `${line} ${w}` : w
    if (candidate.length <= width) {
      line = candidate
      continue
    }

    pushLine(line)
    line = w
    if (lines.length >= height) return lines.slice(0, height)
  }

  if (lines.length < height) pushLine(line)
  while (lines.length < height) pushLine('')
  return lines.slice(0, height)
}

function linesToText(lines) {
  return lines.map((l) => l.slice(0, 22).padEnd(22, ' ')).join('\n')
}

async function vbRead() {
  const headers = authHeaders()
  if (!headers)
    throw new Error('Missing VESTABOARD_TOKEN (preferred) or VESTABOARD_RW_KEY (legacy)')
  const res = await request(API_BASE, {
    method: 'GET',
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
  const body = await res.body.text()
  if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${body}`)
  process.stdout.write(body + (body.endsWith('\n') ? '' : '\n'))
}

async function vbWriteText(text) {
  const headers = authHeaders()
  if (!headers)
    throw new Error('Missing VESTABOARD_TOKEN (preferred) or VESTABOARD_RW_KEY (legacy)')
  const lines = wrapToLines(text)
  const payload = JSON.stringify({ text: linesToText(lines) })
  const res = await request(API_BASE, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: payload,
  })
  const body = await res.body.text()
  if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${body}`)
  process.stdout.write(body + (body.endsWith('\n') ? '' : '\n'))
}

async function vbWriteLayout(path) {
  const headers = authHeaders()
  if (!headers)
    throw new Error('Missing VESTABOARD_TOKEN (preferred) or VESTABOARD_RW_KEY (legacy)')
  const raw = readFileSync(path, 'utf8')
  const layout = JSON.parse(raw)
  const payload = JSON.stringify(layout)
  const res = await request(API_BASE, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: payload,
  })
  const body = await res.body.text()
  if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${body}`)
  process.stdout.write(body + (body.endsWith('\n') ? '' : '\n'))
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (!cmd) usage()

  if (cmd === 'read') return vbRead()
  if (cmd === 'preview') {
    const text = rest.join(' ')
    const lines = wrapToLines(text)
    process.stdout.write(linesToText(lines) + '\n')
    return
  }
  if (cmd === 'write') {
    const text = rest.join(' ')
    return vbWriteText(text)
  }
  if (cmd === 'write-layout') {
    const path = rest[0]
    if (!path) usage()
    return vbWriteLayout(path)
  }

  usage()
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})
