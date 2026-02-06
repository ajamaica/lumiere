#!/usr/bin/env node
/**
 * Collect candidate tweets for Clawdbot/Moltbot digest.
 * Outputs JSON: {tweets:[...], pickedImage:{tweetUrl, imageUrl, localPath}}
 *
 * Requires env: AUTH_TOKEN, CT0
 */

import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function birdJson(args) {
  const out = execFileSync('bird', args, {
    env: {
      ...process.env,
      AUTH_TOKEN: requireEnv('AUTH_TOKEN'),
      CT0: requireEnv('CT0'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  })
  return JSON.parse(out)
}

function search(query, n = 12) {
  return birdJson(['search', query, '-n', String(n), '--json', '--plain'])
}

function tweetUrl(t) {
  const u = t.author?.username
  return u ? `https://x.com/${u}/status/${t.id}` : `https://x.com/i/web/status/${t.id}`
}

function score(t) {
  const text = (t.text || '').toLowerCase()
  let s = 0
  const ts = Date.parse(t.createdAt || '')
  if (!Number.isNaN(ts)) {
    const ageHrs = (Date.now() - ts) / 36e5
    if (ageHrs < 12) s += 8
    else if (ageHrs < 24) s += 5
    else if (ageHrs < 72) s += 2
  }
  const keywords = [
    'use case',
    'use-case',
    'workflow',
    'automation',
    'automate',
    'agent',
    'email',
    'calendar',
    'telegram',
    'self-host',
    'self host',
    'setup',
    'guide',
    'tutorial',
    'workers',
    'cloudflare',
    'r2',
    'security',
    'rce',
  ]
  for (const k of keywords) if (text.includes(k)) s += 2
  if (t.media?.some((m) => m.type === 'photo' && m.url)) s += 6
  s += Math.min(6, (t.likeCount || 0) / 50)
  s += Math.min(4, (t.retweetCount || 0) / 20)
  const u = (t.author?.username || '').toLowerCase()
  if (u.includes('steipete') || u.includes('clawdbot') || u.includes('moltbot')) s += 4
  return s
}

async function download(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const dir = '/tmp/clawdbot-x-digest'
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `img_${Date.now()}.jpg`)
  writeFileSync(file, buf)
  return file
}

async function main() {
  const tweets = [...search('clawdbot', 15), ...search('moltbot', 15)]
  const top = [...tweets]
    .filter((t) => t?.id && t?.text)
    // Keep only tweets clearly about clawdbot/moltbot (search can be noisy)
    .filter((t) => {
      const txt = (t.text || '').toLowerCase()
      const au = (t.author?.username || '').toLowerCase()
      return (
        txt.includes('clawdbot') ||
        txt.includes('moltbot') ||
        au.includes('clawdbot') ||
        au.includes('moltbot') ||
        au.includes('steipete')
      )
    })
    .sort((a, b) => score(b) - score(a))
    .slice(0, 10)
    .map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      text: t.text,
      author: t.author,
      likeCount: t.likeCount,
      retweetCount: t.retweetCount,
      replyCount: t.replyCount,
      url: tweetUrl(t),
      media: t.media || [],
    }))

  const withPhoto = top.find((t) => t.media?.some((m) => m.type === 'photo' && m.url))
  let pickedImage = null
  if (withPhoto) {
    const imageUrl = withPhoto.media.find((m) => m.type === 'photo' && m.url)?.url
    if (imageUrl) {
      const localPath = await download(imageUrl)
      pickedImage = { tweetUrl: withPhoto.url, imageUrl, localPath }
    }
  }

  console.log(JSON.stringify({ tweets: top, pickedImage }))
}

main().catch((e) => {
  console.error(JSON.stringify({ error: String(e) }))
  process.exit(1)
})
