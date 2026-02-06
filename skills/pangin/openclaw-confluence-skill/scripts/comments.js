#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, type, id, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error(
      'Usage: comments.js <list|get|create|update|delete|children|page|blogpost|attachment|custom> <inline|footer> [id]',
    )

  const t = type === 'inline' ? 'inline-comments' : 'footer-comments'

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll(`/${t}`), null, 2))
    return console.log(JSON.stringify(await request('GET', `/${t}`), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/${t}/${id}`), null, 2))
  if (cmd === 'children')
    return console.log(JSON.stringify(await request('GET', `/${t}/${id}/children`), null, 2))
  if (cmd === 'create')
    return console.log(
      JSON.stringify(await request('POST', `/${t}`, JSON.parse(process.argv[4] || '{}')), null, 2),
    )
  if (cmd === 'update')
    return console.log(
      JSON.stringify(
        await request('PUT', `/${t}/${id}`, JSON.parse(process.argv[4] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/${t}/${id}`), null, 2))

  if (cmd === 'page')
    return console.log(JSON.stringify(await request('GET', `/pages/${id}/${t}`), null, 2))
  if (cmd === 'blogpost')
    return console.log(JSON.stringify(await request('GET', `/blogposts/${id}/${t}`), null, 2))
  if (cmd === 'attachment')
    return console.log(JSON.stringify(await request('GET', `/attachments/${id}/${t}`), null, 2))
  if (cmd === 'custom')
    return console.log(JSON.stringify(await request('GET', `/custom-content/${id}/${t}`), null, 2))

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
