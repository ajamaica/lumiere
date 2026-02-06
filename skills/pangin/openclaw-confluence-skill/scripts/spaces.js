#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: spaces.js <list|get|create> [id]')

  if (cmd === 'list') {
    if (rest.includes('--all')) {
      const res = await requestAll('/spaces')
      console.log(JSON.stringify(res, null, 2))
      return
    }
    const res = await request('GET', `/spaces`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'get') {
    const res = await request('GET', `/spaces/${id}`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'create') {
    const payload = JSON.parse(process.argv[3] || '{}')
    const res = await request('POST', `/spaces`, payload)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
