#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [type, id, cmd] = process.argv.slice(2)
  if (!type || !id || !cmd)
    throw new Error(
      'Usage: likes.js <pages|blogposts|footer-comments|inline-comments> <id> <count|users>',
    )
  const res = await request('GET', `/${type}/${id}/likes/${cmd}`)
  console.log(JSON.stringify(res, null, 2))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
