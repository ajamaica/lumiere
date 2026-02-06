#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd)
    throw new Error(
      'Usage: space-roles.js <list|get|create|update|delete|assignments|assign> [id] [json]',
    )

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/space-roles'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/space-roles`), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/space-roles/${id}`), null, 2))
  if (cmd === 'create')
    return console.log(
      JSON.stringify(
        await request('POST', `/space-roles`, JSON.parse(process.argv[3] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'update')
    return console.log(
      JSON.stringify(
        await request('PUT', `/space-roles/${id}`, JSON.parse(process.argv[3] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/space-roles/${id}`), null, 2))
  if (cmd === 'assignments')
    return console.log(
      JSON.stringify(await request('GET', `/spaces/${id}/role-assignments`), null, 2),
    )
  if (cmd === 'assign')
    return console.log(
      JSON.stringify(
        await request(
          'POST',
          `/spaces/${id}/role-assignments`,
          JSON.parse(process.argv[3] || '{}'),
        ),
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
