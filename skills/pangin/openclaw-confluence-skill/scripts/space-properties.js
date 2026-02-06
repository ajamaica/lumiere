#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, propId, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error(
      'Usage: space-properties.js <list|get|set|delete> <spaceId> [property-id] [json]',
    )
  const base = `/spaces/${id}/properties`
  if (cmd === 'list') {
    if (rest.includes('--all')) return console.log(JSON.stringify(await requestAll(base), null, 2))
    return console.log(JSON.stringify(await request('GET', base), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `${base}/${propId}`), null, 2))
  if (cmd === 'set')
    return console.log(
      JSON.stringify(
        await request('PUT', `${base}/${propId}`, JSON.parse(process.argv[4] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `${base}/${propId}`), null, 2))
  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
