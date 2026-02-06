#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: space-permissions.js <list|space> [spaceId]')
  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/space-permissions'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/space-permissions`), null, 2))
  }
  if (cmd === 'space')
    return console.log(JSON.stringify(await request('GET', `/spaces/${id}/permissions`), null, 2))
  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
