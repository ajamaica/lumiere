#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error('Usage: attachments.js <list|get|delete|page|blogpost|custom|label> [id]')

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/attachments'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/attachments`), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/attachments/${id}`), null, 2))
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/attachments/${id}`), null, 2))
  if (cmd === 'page')
    return console.log(JSON.stringify(await request('GET', `/pages/${id}/attachments`), null, 2))
  if (cmd === 'blogpost')
    return console.log(
      JSON.stringify(await request('GET', `/blogposts/${id}/attachments`), null, 2),
    )
  if (cmd === 'custom')
    return console.log(
      JSON.stringify(await request('GET', `/custom-content/${id}/attachments`), null, 2),
    )
  if (cmd === 'label')
    return console.log(JSON.stringify(await request('GET', `/labels/${id}/attachments`), null, 2))

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
