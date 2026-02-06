const fs = require('fs')
const path = require('path')
const Lark = require('@larksuiteoapi/node-sdk')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const client = new Lark.Client({ appId: APP_ID, appSecret: APP_SECRET })

async function listPins(chatId) {
  try {
    // Correct API usage for SDK v3: im.pin.list
    // The error 99992402 usually means invalid parameters.
    // Check if `start_time` or `end_time` are required or if `page_size` has limits.

    console.log(`Listing pins for chat: ${chatId}`)
    const res = await client.im.pin.list({
      params: {
        chat_id: chatId, // Note: For some APIs, chat_id is a query param, for others a path param. SDK handles this?
        // The SDK might require chat_id in `params` for `list`.
        page_size: 20,
      },
    })

    if (res.code !== 0) {
      console.error(`Error listing pins: ${res.code} - ${res.msg}`)
      // Debug: print full error
      console.error(JSON.stringify(res))
      return []
    }

    return res.data.items || []
  } catch (e) {
    console.error(`API Exception: ${e.message}`)
    return []
  }
}

async function getChatId(userId) {
  // Try to get chat_id from user_id
  try {
    const res = await client.im.chat.create({
      params: { user_id_type: 'open_id' },
      data: { user_id: userId },
    })
    if (res.code === 0) return res.data.chat_id
  } catch (e) {}
  return null
}

async function main() {
  const userId = process.argv[2]
  if (!userId) return

  const chatId = await getChatId(userId)
  if (!chatId) {
    console.log('Chat not found.')
    return
  }

  const pins = await listPins(chatId)

  if (pins.length === 0) {
    console.log('No pins found (or API failed).')
    return
  }

  // Process pins
  const summary = pins
    .map((p) => {
      // Pins usually wrap a message. Need to fetch message details if content is sparse.
      // But SDK `items` usually contain message content.
      return `- [${new Date(parseInt(p.create_time)).toLocaleString()}] MessageID: ${p.message_id}`
    })
    .join('\n')

  console.log(summary)
}

main()
