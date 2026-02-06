#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, key, ...rest] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: app-properties.js <list|get|set|delete> [propertyKey] [json]')

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/app/properties'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/app/properties`), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/app/properties/${key}`), null, 2))
  if (cmd === 'set')
    return console.log(
      JSON.stringify(
        await request('PUT', `/app/properties/${key}`, JSON.parse(process.argv[3] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/app/properties/${key}`), null, 2))

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
