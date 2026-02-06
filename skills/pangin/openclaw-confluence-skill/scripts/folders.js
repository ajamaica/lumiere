#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [cmd, id] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: folders.js <get|direct-children|create|delete> [id]')

  if (cmd === 'get') {
    const res = await request('GET', `/folders/${id}`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'direct-children') {
    const res = await request('GET', `/folders/${id}/direct-children`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'create') {
    const payload = JSON.parse(process.argv[3] || '{}')
    const res = await request('POST', `/folders`, payload)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'delete') {
    const res = await request('DELETE', `/folders/${id}`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
