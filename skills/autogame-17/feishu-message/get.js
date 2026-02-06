#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

async function getToken() {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
      const now = Math.floor(Date.now() / 1000)
      if (cached.expire > now + 60) return cached.token
    }
  } catch (e) {}

  try {
    const res = await fetch(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
      },
    )
    const data = await res.json()
    if (data.code !== 0) throw new Error(`Auth failed: ${JSON.stringify(data)}`)

    try {
      fs.writeFileSync(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          token: data.tenant_access_token,
          expire: Math.floor(Date.now() / 1000) + data.expire,
        }),
      )
    } catch (e) {}

    return data.tenant_access_token
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

async function fetchMessage(messageId) {
  const token = await getToken()
  const url = `https://open.feishu.cn/open-apis/im/v1/messages/${messageId}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const json = await res.json()

  if (json.code !== 0) {
    throw new Error(`API Error ${json.code}: ${json.msg}`)
  }
  return json.data
}

function parseContent(msgBody) {
  try {
    const content = JSON.parse(msgBody.content)
    if (content.text) return content.text
    if (content.title && content.content) {
      // Post type
      return (
        `[Post] ${content.title}\n` +
        content.content.map((p) => p.map((e) => e.text).join('')).join('\n')
      )
    }
    return JSON.stringify(content)
  } catch (e) {
    return msgBody.content
  }
}

async function formatMessage(msg, depth = 0) {
  const indent = '  '.repeat(depth)
  let output = ''

  const sender = msg.sender.sender_type === 'user' ? msg.sender.id || 'User' : 'App'
  const time = new Date(parseInt(msg.create_time)).toISOString().replace('T', ' ').substring(0, 19)

  if (msg.msg_type === 'merge_forward') {
    output += `${indent}📂 [Merged Forward] (${time})\n`
    // Feishu returns items in data.items for merge_forward type specifically
    if (msg.items && Array.isArray(msg.items)) {
      for (const item of msg.items) {
        output += await formatMessage(item, depth + 1)
      }
    } else {
      output += `${indent}  (No items found or not expanded)\n`
    }
  } else {
    const content = parseContent(msg.body)
    output += `${indent}💬 [${sender}] ${time}: ${content}\n`
  }

  return output
}

program
  .argument('<message_id>', 'Message ID to read')
  .option('-r, --raw', 'Output raw JSON')
  .action(async (messageId, options) => {
    try {
      const data = await fetchMessage(messageId)

      // data.items is present if it's a merge_forward and we fetched it by ID
      // If data.items exists, we treat it as a collection

      if (options.raw) {
        console.log(JSON.stringify(data, null, 2))
      } else {
        // If the root message is merge_forward, data.items contains the children
        // data.items[0] is the root container usually? No, items array contains the children.

        if (data.items && data.items.length > 0) {
          console.log(`📦 Merged Message (${data.items.length} items):\n`)
          for (const item of data.items) {
            // The items list includes the forwarded messages.
            // Sometimes the first item is the container?
            // Let's just print all items.
            if (item.message_id === messageId) continue // Skip self if present
            console.log(await formatMessage(item))
          }
        } else {
          // Single message? Or items inside items[0]?
          // Based on debug output: data.items contains the list.
          // If it's a single message (not merge), data might not have items or have items=[msg]
          if (data.items) {
            for (const item of data.items) console.log(await formatMessage(item))
          } else {
            // Fallback for single message structure?
            // The get-message-by-id endpoint usually returns { items: [msg] } if queried properly?
            // Actually regular get returns { items: [msg] } in some versions or just data=msg?
            // The debug output showed data: { items: [...] } for the merge message ID.
            // Let's assume data.items is the standard list container.
            console.log(await formatMessage(data.items ? data.items[0] : data))
          }
        }
      }
    } catch (e) {
      console.error('Error:', e.message)
      process.exit(1)
    }
  })

program.parse()
