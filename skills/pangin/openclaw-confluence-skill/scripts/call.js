#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [method, path, body] = process.argv.slice(2)
  if (!method || !path) {
    throw new Error('Usage: call.js <GET|POST|PUT|DELETE> </path> [jsonBody]')
  }
  const payload = body ? JSON.parse(body) : undefined
  const res = await request(method.toUpperCase(), path, payload)
  console.log(JSON.stringify(res, null, 2))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
