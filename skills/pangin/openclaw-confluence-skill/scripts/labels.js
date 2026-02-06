#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error(
      'Usage: labels.js <list|page|blogpost|attachment|custom|space|space-content> [id]',
    )

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/labels'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/labels`), null, 2))
  }
  if (cmd === 'page')
    return console.log(JSON.stringify(await request('GET', `/pages/${id}/labels`), null, 2))
  if (cmd === 'blogpost')
    return console.log(JSON.stringify(await request('GET', `/blogposts/${id}/labels`), null, 2))
  if (cmd === 'attachment')
    return console.log(JSON.stringify(await request('GET', `/attachments/${id}/labels`), null, 2))
  if (cmd === 'custom')
    return console.log(
      JSON.stringify(await request('GET', `/custom-content/${id}/labels`), null, 2),
    )
  if (cmd === 'space')
    return console.log(JSON.stringify(await request('GET', `/spaces/${id}/labels`), null, 2))
  if (cmd === 'space-content')
    return console.log(
      JSON.stringify(await request('GET', `/spaces/${id}/content/labels`), null, 2),
    )

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
