#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [type, id] = process.argv.slice(2)
  if (!type || !id) throw new Error('Usage: redactions.js <pages|blogposts> <id>')
  const res = await request('POST', `/${type}/${id}/redact`)
  console.log(JSON.stringify(res, null, 2))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
