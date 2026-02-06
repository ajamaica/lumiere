#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [type, id] = process.argv.slice(2)
  if (!type || !id)
    throw new Error(
      'Usage: operations.js <pages|blogposts|attachments|custom-content|databases|embeds|folders|footer-comments|inline-comments|spaces|whiteboards> <id>',
    )
  const res = await request('GET', `/${type}/${id}/operations`)
  console.log(JSON.stringify(res, null, 2))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
