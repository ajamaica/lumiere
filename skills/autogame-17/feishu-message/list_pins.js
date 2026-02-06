const fs = require('fs')
const path = require('path')
const Lark = require('@larksuiteoapi/node-sdk')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const client = new Lark.Client({ appId: APP_ID, appSecret: APP_SECRET })

async function listPins(chatId) {
  try {
    const res = await client.im.pin.list({
      path: { chat_id: chatId },
      params: { page_size: 50 },
    })

    if (res.code !== 0) {
      console.error(`Error listing pins: ${res.msg}`)
      return []
    }

    return res.data.items_page.items || []
  } catch (e) {
    console.error(`API Exception: ${e.message}`)
    return []
  }
}

async function getChatId(userId) {
  // 1. Try to create/get P2P chat
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
  if (!userId) {
    console.error('Usage: node list_pins.js <user_id>')
    return
  }

  // 1. Get Chat ID
  const chatId = await getChatId(userId)
  if (!chatId) {
    console.error('Could not find P2P chat ID for user.')
    return
  }

  console.log(`Chat ID: ${chatId}`)

  // 2. List Pins
  const pins = await listPins(chatId)

  if (pins.length === 0) {
    console.log('No pinned messages found.')
    return
  }

  const summary = pins
    .map((p) => {
      let content = 'Unknown'
      try {
        const msgContent = JSON.parse(p.message.content)
        if (p.message.msg_type === 'text') content = msgContent.text
        else if (p.message.msg_type === 'post') content = msgContent.title || '(Rich Text)'
        else content = `[${p.message.msg_type}]`
      } catch (e) {}

      const time = new Date(parseInt(p.create_time)).toLocaleString()
      return `- [${time}] ${content}`
    })
    .join('\n')

  console.log(summary)
}

main()
