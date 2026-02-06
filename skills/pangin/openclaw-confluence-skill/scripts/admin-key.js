#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: admin-key.js <get|create|delete> [json]')

  if (cmd === 'get') return console.log(JSON.stringify(await request('GET', `/admin-key`), null, 2))
  if (cmd === 'create')
    return console.log(
      JSON.stringify(
        await request('POST', `/admin-key`, JSON.parse(process.argv[2] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'delete')
    return console.log(JSON.stringify(await request('DELETE', `/admin-key`), null, 2))

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
