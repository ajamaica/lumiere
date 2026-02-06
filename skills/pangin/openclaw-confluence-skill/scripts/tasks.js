#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: tasks.js <list|get|update> [id]')

  if (cmd === 'list') {
    if (rest.includes('--all'))
      return console.log(JSON.stringify(await requestAll('/tasks'), null, 2))
    return console.log(JSON.stringify(await request('GET', `/tasks`), null, 2))
  }
  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/tasks/${id}`), null, 2))
  if (cmd === 'update')
    return console.log(
      JSON.stringify(
        await request('PUT', `/tasks/${id}`, JSON.parse(process.argv[3] || '{}')),
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
