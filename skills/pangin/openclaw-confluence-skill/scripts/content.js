#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd] = process.argv.slice(2)
  if (cmd !== 'convert-ids') throw new Error('Usage: content.js convert-ids <json>')
  const res = await request(
    'POST',
    `/content/convert-ids-to-types`,
    JSON.parse(process.argv[2] || '{}'),
  )
  console.log(JSON.stringify(res, null, 2))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
