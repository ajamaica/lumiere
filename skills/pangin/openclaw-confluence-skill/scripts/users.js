#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: users.js <bulk|check-access|invite> [json]')

  if (cmd === 'bulk')
    return console.log(
      JSON.stringify(
        await request('POST', `/users-bulk`, JSON.parse(process.argv[2] || '{}')),
        null,
        2,
      ),
    )
  if (cmd === 'check-access')
    return console.log(
      JSON.stringify(
        await request(
          'POST',
          `/user/access/check-access-by-email`,
          JSON.parse(process.argv[2] || '{}'),
        ),
        null,
        2,
      ),
    )
  if (cmd === 'invite')
    return console.log(
      JSON.stringify(
        await request('POST', `/user/access/invite-by-email`, JSON.parse(process.argv[2] || '{}')),
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
