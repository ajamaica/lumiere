#!/usr/bin/env node
/**
 * Facebook Page OAuth Authentication
 * Manual code flow - user copies redirect URL containing code
 */

import { config } from 'dotenv'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = join(__dirname, '..')
const ENV_FILE = join(SKILL_DIR, '.env')
const TOKENS_FILE = join(SKILL_DIR, 'tokens.json')

// Load .env from skill directory
config({ path: ENV_FILE })

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'public_profile']

function loadConfig() {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  if (!appId || !appSecret) {
    console.error('Error: META_APP_ID and META_APP_SECRET not found')
    console.error(`Create .env file at: ${ENV_FILE}`)
    console.error('Copy from .env.example and fill in your values')
    process.exit(1)
  }

  return { app_id: appId, app_secret: appSecret }
}

function saveTokens(tokens) {
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2))
  chmodSync(TOKENS_FILE, 0o600)
  console.log(`Tokens saved to ${TOKENS_FILE}`)
}

function loadTokens() {
  if (!existsSync(TOKENS_FILE)) return null
  return JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'))
}

function getLoginUrl(config) {
  const params = new URLSearchParams({
    client_id: config.app_id,
    redirect_uri: 'https://localhost/',
    scope: SCOPES.join(','),
    response_type: 'code',
  })
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`
}

async function exchangeCodeForToken(code, config) {
  const params = new URLSearchParams({
    client_id: config.app_id,
    client_secret: config.app_secret,
    redirect_uri: 'https://localhost/',
    code,
  })

  const resp = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`)
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(JSON.stringify(err))
  }
  return resp.json()
}

async function getLongLivedToken(shortToken, config) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.app_id,
    client_secret: config.app_secret,
    fb_exchange_token: shortToken,
  })

  const resp = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`)
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(JSON.stringify(err))
  }
  return resp.json()
}

async function getPageTokens(userToken) {
  const params = new URLSearchParams({
    access_token: userToken,
    fields: 'id,name,access_token',
  })

  const resp = await fetch(`${GRAPH_API_BASE}/me/accounts?${params}`)
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(JSON.stringify(err))
  }
  const data = await resp.json()
  return data.data || []
}

function extractCodeFromUrl(url) {
  try {
    const parsed = new URL(url)
    const code = parsed.searchParams.get('code')
    if (code) return code

    // Check fragment
    const fragmentParams = new URLSearchParams(parsed.hash.slice(1))
    return fragmentParams.get('code')
  } catch {
    return null
  }
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function cmdLogin() {
  const config = loadConfig()
  const loginUrl = getLoginUrl(config)

  console.log('\n=== Facebook Page OAuth Login ===\n')
  console.log('1. Open this URL in your browser:\n')
  console.log(loginUrl)
  console.log('\n2. Log in and approve the permissions')
  console.log("3. After approval, you'll be redirected to a URL starting with:")
  console.log('   https://localhost/?code=...')
  console.log('   (Browser sẽ báo lỗi không load được - đó là bình thường!)')
  console.log('\n4. Copy the ENTIRE URL from your browser address bar and paste it below:\n')

  const redirectUrl = await prompt('Paste URL here: ')

  const code = extractCodeFromUrl(redirectUrl)
  if (!code) {
    console.error('Error: Could not extract code from URL')
    process.exit(1)
  }

  console.log('\nExchanging code for token...')
  const tokenResp = await exchangeCodeForToken(code, config)
  const shortToken = tokenResp.access_token

  console.log('Getting long-lived token...')
  const longLivedResp = await getLongLivedToken(shortToken, config)
  const userToken = longLivedResp.access_token

  console.log('Fetching Page tokens...')
  const pages = await getPageTokens(userToken)

  if (!pages.length) {
    console.log('Warning: No Pages found. Make sure you have admin access to at least one Page.')
  }

  const tokens = {
    user_token: userToken,
    pages: Object.fromEntries(pages.map((p) => [p.id, { name: p.name, token: p.access_token }])),
  }

  saveTokens(tokens)

  console.log(`\nSuccess! Found ${pages.length} Page(s):`)
  for (const page of pages) {
    console.log(`  - ${page.name} (ID: ${page.id})`)
  }
}

function cmdStatus() {
  const tokens = loadTokens()
  if (!tokens) {
    console.log('No tokens found. Run: node auth.js login')
    return
  }

  console.log(`User token: ${tokens.user_token ? 'Present' : 'Missing'}`)
  console.log(`Pages: ${Object.keys(tokens.pages || {}).length}`)
  for (const [pageId, pageInfo] of Object.entries(tokens.pages || {})) {
    console.log(`  - ${pageInfo.name} (ID: ${pageId})`)
  }
}

async function cmdRefresh() {
  const config = loadConfig()
  const tokens = loadTokens()

  if (!tokens?.user_token) {
    console.log('No user token found. Run: node auth.js login')
    return
  }

  console.log('Refreshing page tokens...')
  const pages = await getPageTokens(tokens.user_token)

  tokens.pages = Object.fromEntries(
    pages.map((p) => [p.id, { name: p.name, token: p.access_token }]),
  )
  saveTokens(tokens)

  console.log(`Refreshed ${pages.length} Page token(s)`)
}

// Main
const cmd = process.argv[2]

switch (cmd) {
  case 'login':
    cmdLogin()
    break
  case 'status':
    cmdStatus()
    break
  case 'refresh':
    cmdRefresh()
    break
  default:
    console.log('Usage: node auth.js <command>')
    console.log('Commands: login, status, refresh')
}
