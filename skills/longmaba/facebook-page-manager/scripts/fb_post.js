#!/usr/bin/env node
/**
 * Post to Facebook Page using existing tokens.json
 * Usage:
 *   node fb_post.js --page <PAGE_ID> --caption-file <path> [--image <path>]
 */

import { Blob } from 'buffer'
import { existsSync, readFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const TOKENS_FILE = join(SKILL_DIR, 'tokens.json')

const GRAPH_API_VERSION = 'v21.0'
const FB_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

function arg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

async function postText(pageId, pageToken, message) {
  const url = new URL(`${FB_BASE}/${pageId}/feed`)
  url.searchParams.set('access_token', pageToken)
  const body = new URLSearchParams({ message })
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`FB error: ${JSON.stringify(data)}`)
  return data
}

async function postPhoto(pageId, pageToken, imagePath, caption) {
  const url = new URL(`${FB_BASE}/${pageId}/photos`)
  url.searchParams.set('access_token', pageToken)

  const fileBuf = readFileSync(imagePath)
  const form = new FormData()
  form.set('message', caption)
  form.set('source', new Blob([fileBuf]), basename(imagePath))

  const resp = await fetch(url, { method: 'POST', body: form })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`FB error: ${JSON.stringify(data)}`)
  return data
}

async function main() {
  const pageId = arg('--page')
  const captionFile = arg('--caption-file')
  const imagePath = arg('--image')

  if (!pageId || !captionFile) {
    console.error('Usage: node fb_post.js --page <PAGE_ID> --caption-file <path> [--image <path>]')
    process.exit(2)
  }

  if (!existsSync(TOKENS_FILE)) throw new Error(`Missing tokens: ${TOKENS_FILE}`)
  const tokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'))
  const pageToken = tokens.pages?.[pageId]?.token
  if (!pageToken) throw new Error(`No token for page ${pageId}`)

  const caption = readFileSync(captionFile, 'utf-8').trim()
  if (!caption) throw new Error('Empty caption')

  const result = imagePath
    ? await postPhoto(pageId, pageToken, imagePath, caption)
    : await postText(pageId, pageToken, caption)

  console.log(
    JSON.stringify({
      ok: true,
      pageId,
      postId: result.id || result.post_id,
      usedPhoto: Boolean(imagePath),
    }),
  )
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e) }))
  process.exit(1)
})
