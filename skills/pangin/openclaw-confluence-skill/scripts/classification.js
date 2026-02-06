#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, type, id, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error(
      'Usage: classification.js <list|get|set|reset|space-default|space-set|space-delete> [type] [id] [json]',
    )

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/classification-levels'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/classification-levels`), null, 2))
  }
  if (cmd === 'get')
    return console.log(
      JSON.stringify(await request('GET', `/${type}/${id}/classification-level`), null, 2),
    )
  if (cmd === 'set')
    return console.log(
      JSON.stringify(
        await request(
          'PUT',
          `/${type}/${id}/classification-level`,
          JSON.parse(process.argv[4] || '{}'),
        ),
        null,
        2,
      ),
    )
  if (cmd === 'reset')
    return console.log(
      JSON.stringify(await request('POST', `/${type}/${id}/classification-level/reset`), null, 2),
    )
  if (cmd === 'space-default')
    return console.log(
      JSON.stringify(await request('GET', `/spaces/${id}/classification-level/default`), null, 2),
    )
  if (cmd === 'space-set')
    return console.log(
      JSON.stringify(
        await request(
          'PUT',
          `/spaces/${id}/classification-level/default`,
          JSON.parse(process.argv[4] || '{}'),
        ),
        null,
        2,
      ),
    )
  if (cmd === 'space-delete')
    return console.log(
      JSON.stringify(
        await request('DELETE', `/spaces/${id}/classification-level/default`),
        null,
        2,
      ),
    )

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
