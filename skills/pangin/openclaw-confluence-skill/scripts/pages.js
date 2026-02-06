#!/usr/bin/env node
const { request, requestAll } = require('./client')

async function main() {
  const [cmd, id, ...rest] = process.argv.slice(2)
  if (!cmd) throw new Error('Usage: pages.js <list|get|create|update|delete|direct-children> [id]')

  if (cmd === 'list') {
    if (rest.includes('--all')) {
      const res = await requestAll('/pages')
      console.log(JSON.stringify(res, null, 2))
      return
    }
    const res = await request('GET', `/pages`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'get') {
    const res = await request('GET', `/pages/${id}`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'direct-children') {
    const res = await request('GET', `/pages/${id}/direct-children`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'create') {
    const payload = JSON.parse(process.argv[3] || '{}')
    const res = await request('POST', `/pages`, payload)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'update') {
    const payload = JSON.parse(process.argv[3] || '{}')
    const res = await request('PUT', `/pages/${id}`, payload)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  if (cmd === 'delete') {
    const res = await request('DELETE', `/pages/${id}`)
    console.log(JSON.stringify(res, null, 2))
    return
  }

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
