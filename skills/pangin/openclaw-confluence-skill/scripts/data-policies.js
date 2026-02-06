#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: data-policies.js <metadata|spaces>')
  if (cmd === 'metadata')
    return console.log(JSON.stringify(await request('GET', `/data-policies/metadata`), null, 2))
  if (cmd === 'spaces')
    return console.log(JSON.stringify(await request('GET', `/data-policies/spaces`), null, 2))
  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
