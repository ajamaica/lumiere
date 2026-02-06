#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [type, id, cmd, propId, ...rest] = process.argv.slice(2)
  if (!type || !id || !cmd)
    throw new Error('Usage: properties.js <type> <id> <list|get|set|delete> [property-id] [json]')

  const base = `/${type}/${id}/properties`
  if (cmd === 'list') {
    if (rest.includes('--all')) return console.log(JSON.stringify(await requestAll(base), null, 2))
    return console.log(JSON.stringify(await request('GET', base), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `${base}/${propId}`), null, 2))
  if (cmd === 'set')
    return console.log(
      JSON.stringify(
        await request('PUT', `${base}/${propId}`, JSON.parse(process.argv[6] || '{}')),
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
