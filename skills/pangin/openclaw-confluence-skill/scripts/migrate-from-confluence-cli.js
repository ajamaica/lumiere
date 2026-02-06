#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const src = path.join(process.env.HOME || '', '.confluence-cli', 'config.json')
const dst = path.join(__dirname, '..', '.env')

if (!fs.existsSync(src)) {
  console.error('No confluence-cli config found at ' + src)
  process.exit(1)
}

const raw = fs.readFileSync(src, 'utf8')
const cfg = JSON.parse(raw)

const domain = cfg.domain || cfg.url || cfg.baseUrl || cfg.base_url
const email = cfg.email || cfg.user || cfg.username
const token = cfg.token || cfg.apiToken || cfg.api_token

if (!domain || !email || !token) {
  console.error('Missing domain/email/token in confluence-cli config.')
  process.exit(1)
}

const baseUrl = domain.includes('http')
  ? domain.replace(/\/$/, '')
  : `https://${domain.replace(/\/$/, '')}`
const wikiBase = baseUrl.endsWith('/wiki') ? baseUrl : `${baseUrl}/wiki`

const env = [
  `CONFLUENCE_BASE_URL=${wikiBase}`,
  `CONFLUENCE_AUTH_METHOD=basic`,
  `CONFLUENCE_EMAIL=${email}`,
  `CONFLUENCE_API_TOKEN=${token}`,
  '',
].join('\n')

fs.writeFileSync(dst, env, 'utf8')
console.log('Wrote ' + dst)
