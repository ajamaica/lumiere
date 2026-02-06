#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd, id] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: embeds.js <get|create|delete> [id]')

  if (cmd === 'get')
    return console.log(JSON.stringify(await request('GET', `/embeds/${id}`), null, 2))
  if (cmd === 'create')
    return console.log(
      JSON.stringify(
        await request('POST', `/embeds`, JSON.parse(process.argv[3] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/embeds/${id}`), null, 2))

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
