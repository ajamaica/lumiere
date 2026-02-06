#!/usr/bin/env node
/**
 * X -> Facebook Page digest poster
 * - Searches X for Clawdbot + Moltbot
 * - Prioritizes use-cases/automation posts
 * - Picks 1 tweet with an image (photo)
 * - Posts to a Facebook Page as a photo post with caption + links
 *
 * Requirements:
 * - X cookies in env: AUTH_TOKEN, CT0
 * - FB tokens.json at ../tokens.json (generated earlier)
 */

import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const TOKENS_FILE = join(SKILL_DIR, 'tokens.json')

const GRAPH_API_VERSION = 'v21.0'
const FB_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function loadFbTokens() {
  if (!existsSync(TOKENS_FILE)) {
    throw new Error(`Missing FB tokens file: ${TOKENS_FILE}. Run auth flow first.`)
  }
  return JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'))
}

function birdSearchJson(query, count = 12) {
  const out = execFileSync('bird', ['search', query, '-n', String(count), '--json', '--plain'], {
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

function scoreTweet(t) {
  const text = (t.text || '').toLowerCase()
  let score = 0

  // prefer recency (createdAt is string; coarse heuristic via Date)
  const ts = Date.parse(t.createdAt || '')
  if (!Number.isNaN(ts)) {
    const ageHrs = (Date.now() - ts) / 36e5
    if (ageHrs < 12) score += 8
    else if (ageHrs < 24) score += 5
    else if (ageHrs < 72) score += 2
  }

  // prefer use-cases
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
  ]
  for (const k of keywords) if (text.includes(k)) score += 2

  // prefer images
  if (t.media?.some((m) => m.type === 'photo' && m.url)) score += 6

  // engagement signal
  score += Math.min(6, (t.likeCount || 0) / 50)
  score += Math.min(4, (t.retweetCount || 0) / 20)

  // prefer relevant authors
  const u = (t.author?.username || '').toLowerCase()
  if (u.includes('steipete') || u.includes('clawdbot') || u.includes('moltbot')) score += 4

  return score
}

function pickTop(tweets, n = 6) {
  return [...tweets]
    .filter((t) => t?.id && t?.text)
    .sort((a, b) => scoreTweet(b) - scoreTweet(a))
    .slice(0, n)
}

function tweetUrl(t) {
  const u = t.author?.username
  return u ? `https://x.com/${u}/status/${t.id}` : `https://x.com/i/web/status/${t.id}`
}

async function downloadToTmp(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to download image: ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const dir = '/tmp/clawdbot-x-digest'
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `img_${Date.now()}.jpg`)
  writeFileSync(file, buf)
  return file
}

async function fbUploadPhoto(pageId, pageToken, imagePath, caption) {
  const url = new URL(`${FB_BASE}/${pageId}/photos`)
  url.searchParams.set('access_token', pageToken)

  const fileBuf = readFileSync(imagePath)
  const form = new FormData()
  form.set('message', caption)
  form.set('source', new Blob([fileBuf]), 'image.jpg')

  const resp = await fetch(url, { method: 'POST', body: form })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`FB error: ${JSON.stringify(data)}`)
  return data
}

function buildCaption(topTweets) {
  const lines = []
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const MM = String(now.getMonth() + 1).padStart(2, '0')

  lines.push(`Tổng hợp nhanh tin X về Clawdbot/Moltbot (${hh}:${mm} ${dd}/${MM})`)
  lines.push('')
  lines.push('Ưu tiên: use-cases / automation / setup.')
  lines.push('')

  topTweets.forEach((t, i) => {
    const author = t.author?.username ? `@${t.author.username}` : ''
    const text = (t.text || '').replace(/\s+/g, ' ').trim()
    const snippet = text.length > 160 ? text.slice(0, 157) + '…' : text
    lines.push(`${i + 1}) ${author}: ${snippet}`)
    lines.push(`   ${tweetUrl(t)}`)
  })

  lines.push('')
  lines.push('Theo dõi thêm: clawd.bot | github.com/clawdbot/clawdbot')
  lines.push('#Clawdbot #Moltbot #AI #Automation #OpenSource')

  // FB caption max is high, but keep it compact
  return lines.join('\n').slice(0, 6000)
}

async function main() {
  const pageId = process.argv[2] || process.env.FB_PAGE_ID
  if (!pageId) throw new Error('Missing page id. Pass as arg or set FB_PAGE_ID')

  const fbTokens = loadFbTokens()
  const pageInfo = fbTokens.pages?.[pageId]
  if (!pageInfo?.token) {
    throw new Error(`Page ${pageId} token not found in ${TOKENS_FILE}`)
  }

  // Search queries
  const q1 = 'clawdbot'
  const q2 = 'moltbot'
  const tweets = [...birdSearchJson(q1, 12), ...birdSearchJson(q2, 12)]

  const top = pickTop(tweets, 6)
  if (!top.length) throw new Error('No tweets found')

  // pick first with photo
  const withPhoto = top.find((t) => t.media?.some((m) => m.type === 'photo' && m.url))
  const photoUrl = withPhoto?.media?.find((m) => m.type === 'photo' && m.url)?.url

  const caption = buildCaption(top)

  let result
  if (photoUrl) {
    const imgPath = await downloadToTmp(photoUrl)
    result = await fbUploadPhoto(pageId, pageInfo.token, imgPath, caption)
  } else {
    // Fallback to text post
    const url = new URL(`${FB_BASE}/${pageId}/feed`)
    url.searchParams.set('access_token', pageInfo.token)
    const body = new URLSearchParams({ message: caption })
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(`FB error: ${JSON.stringify(data)}`)
    result = data
  }

  console.log(
    JSON.stringify({
      ok: true,
      pageId,
      postId: result.id || result.post_id,
      usedPhoto: Boolean(photoUrl),
    }),
  )
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }))
  process.exit(1)
})
