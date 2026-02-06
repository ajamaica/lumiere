#!/usr/bin/env node
const { request } = require('./client')

async function main() {
  const [type, id, cmd] = process.argv.slice(2)
  if (!type || !id || !cmd)
    throw new Error(
      'Usage: children.js <pages|custom-content|databases|embeds|folders|whiteboards> <id> <children|direct-children>',
    )

  if (cmd === 'children')
    return console.log(JSON.stringify(await request('GET', `/${type}/${id}/children`), null, 2))
  if (cmd === 'direct-children')
    return console.log(
      JSON.stringify(await request('GET', `/${type}/${id}/direct-children`), null, 2),
    )

  throw new Error('Unknown command')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
