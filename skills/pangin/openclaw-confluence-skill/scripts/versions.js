#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [type, id, cmd, ver, ...rest] = process.argv.slice(2)
  if (!type || !id || !cmd)
    throw new Error(
      'Usage: versions.js <pages|blogposts|attachments|custom-content|footer-comments|inline-comments> <id> <list|get> [version-number]',
    )

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll(`/${type}/${id}/versions`), null, 2))
    return console.log(JSON.stringify(await request('GET', `/${type}/${id}/versions`), null, 2))
  }
  if (cmd === 'get')
    return console.log(
      JSON.stringify(await request('GET', `/${type}/${id}/versions/${ver}`), null, 2),
    )

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
