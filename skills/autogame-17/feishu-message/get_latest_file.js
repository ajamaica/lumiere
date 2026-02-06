const fs = require('fs')
const path = require('path')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

program
  .option('--chat-id <id>', 'Chat ID (or User OpenID but API needs chat_id)')
  .parse(process.argv)
const options = program.opts()

async function getToken() {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
    if (cached.expire > Math.floor(Date.now() / 1000) + 60) return cached.token
  }
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  })
  const data = await res.json()
  return data.tenant_access_token
}

async function getHistory() {
  const token = await getToken()
  console.log(`Fetching history for ${options.chatId}...`)
  // Note: 'im/v1/messages' lists messages in a chat. It requires 'container_id' which is 'chat_id'.
  // If 'options.chatId' is a user OpenID, we first need to get the chat_id of the P2P chat.

  let chatId = options.chatId
  if (chatId.startsWith('ou_')) {
    // Get P2P Chat ID first (Not directly exposed via API easily without creating a chat, but we can try listing recent chats?)
    // Or create a chat to ensure it exists and get ID.
    // POST /im/v1/p2p_chats
    const res = await fetch(`https://open.feishu.cn/open-apis/im/v1/p2p_chats`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: chatId }),
    })
    const data = await res.json()
    if (data.code === 0) {
      chatId = data.data.chat_id
      console.log(`Resolved P2P Chat ID: ${chatId}`)
    } else {
      console.error('Failed to resolve P2P chat:', JSON.stringify(data))
      return
    }
  }

  const res = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?container_id_type=chat&container_id=${chatId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  const data = await res.json()
  if (data.code === 0 && data.data.items) {
    // Find latest file message
    const fileMsg = data.data.items.find((m) => m.msg_type === 'file')
    if (fileMsg) {
      console.log(JSON.stringify(fileMsg, null, 2))
    } else {
      console.log('No file message found.')
    }
  } else {
    console.log('Error or no messages:', JSON.stringify(data))
  }
}

getHistory()
