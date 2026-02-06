#!/usr/bin/env node
const { program } = require('commander')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

// --- Configuration ---
const MEMORY_DIR = path.resolve(__dirname, '../../memory')
const TOKEN_PATH = path.join(MEMORY_DIR, 'feishu_token.json')
const GROUPS_FILE = path.join(MEMORY_DIR, 'active_groups.json')

// --- Helper: Get Token ---
async function getToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'))
    if (data.token && data.expire > Date.now() / 1000) {
      return data.token
    }
  }
  // Fallback: This script assumes the agent environment maintains valid tokens or has another way to get them.
  // For now, we rely on the shared token file. If missing, we might fail.
  // In a full implementation, we'd call the `get_tenant_access_token` API here.
  throw new Error('Valid Feishu token not found in memory/feishu_token.json')
}

// --- Helper: Get User's P2P Chat ID ---
async function getP2PChatId(token, openId) {
  try {
    const res = await axios.post(
      'https://open.feishu.cn/open-apis/im/v1/chats?user_id_type=open_id',
      { user_id: openId },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.data.code === 0) {
      return res.data.data.chat_id
    }
  } catch (e) {
    // Ignore P2P errors (maybe user blocked bot or invalid ID)
  }
  return null
}

// --- Helper: Fetch Messages from Chat ---
async function fetchMessages(token, chatId, hours = 24) {
  const messages = []
  const startTime = (Date.now() - hours * 3600 * 1000).toString() // Approx check

  try {
    const url = `https://open.feishu.cn/open-apis/im/v1/messages?container_id_type=chat&container_id=${chatId}&page_size=50&sort_type=ByCreateTimeDesc`
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })

    if (res.data.code === 0 && res.data.data.items) {
      for (const item of res.data.data.items) {
        // Time filter (API sort helps, but we filter strictly)
        if (parseInt(item.create_time) < Date.now() - hours * 3600 * 1000) continue
        messages.push(item)
      }
    }
  } catch (e) {
    // console.error(`Failed to fetch ${chatId}: ${e.message}`);
  }
  return messages
}

// --- Helper: Parse Message Content ---
function parseContent(msg) {
  try {
    const body = JSON.parse(msg.body.content)
    if (msg.msg_type === 'text') return body.text
    if (msg.msg_type === 'image') return `[Image: ${body.image_key}]`
    if (msg.msg_type === 'post') return `[Post: ${body.title || 'Untitled'}]`
    return `[${msg.msg_type}]`
  } catch (e) {
    return `[Unparseable Content]`
  }
}

// --- Main Logic: Recall ---
async function recall(userId, hours) {
  console.log(`🔍 Scanning history for user: ${userId} (Last ${hours}h)...`)
  const token = await getToken()
  const foundMessages = []

  // 1. Check P2P
  const p2pChatId = await getP2PChatId(token, userId)
  if (p2pChatId) {
    // console.log(`  Checking DM (${p2pChatId})...`);
    const p2pMsgs = await fetchMessages(token, p2pChatId, hours)
    p2pMsgs.forEach((m) => {
      if (m.sender.id === userId) {
        foundMessages.push({ source: 'DM', chat_id: p2pChatId, ...m })
      }
    })
  }

  // 2. Check Groups
  let groups = []
  if (fs.existsSync(GROUPS_FILE)) {
    groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'))
  } else {
    // Default seed if file missing
    groups = [
      { id: 'oc_33b2e82369ad588a73ac0ded7ca87b2a', name: 'GenerativeGame项目群' },
      { id: 'oc_31130b0ef61522a3ba111b1893eb6189', name: '运营事项内部群' },
    ]
  }

  for (const group of groups) {
    // console.log(`  Checking Group: ${group.name}...`);
    const groupMsgs = await fetchMessages(token, group.id, hours)
    groupMsgs.forEach((m) => {
      if (m.sender.id === userId) {
        foundMessages.push({ source: `Group: ${group.name}`, chat_id: group.id, ...m })
      }
    })
  }

  // 3. Sort & Display
  foundMessages.sort((a, b) => parseInt(a.create_time) - parseInt(b.create_time))

  if (foundMessages.length === 0) {
    console.log(`❌ No messages found from ${userId} in the last ${hours} hours.`)
  } else {
    console.log(`✅ Found ${foundMessages.length} messages:\n`)
    foundMessages.forEach((m) => {
      const time = new Date(parseInt(m.create_time))
        .toISOString()
        .replace('T', ' ')
        .substring(5, 16)
      console.log(`[${time}] [${m.source}] ${parseContent(m)}`)
    })
  }
}

// --- CLI Setup ---
program
  .command('recall')
  .description('Find recent messages from a user')
  .requiredOption('-u, --user <id>', 'User Open ID')
  .option('-h, --hours <number>', 'Lookback hours', '24')
  .action(async (cmd) => {
    await recall(cmd.user, cmd.hours)
  })

program
  .command('add-group')
  .description('Track a new group for memory scanning')
  .requiredOption('-i, --id <id>', 'Chat ID (oc_...)')
  .requiredOption('-n, --name <name>', 'Group Name')
  .action((cmd) => {
    let groups = []
    if (fs.existsSync(GROUPS_FILE)) groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'))

    // Remove existing if duplicate ID
    groups = groups.filter((g) => g.id !== cmd.id)
    groups.push({ id: cmd.id, name: cmd.name })

    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2))
    console.log(`✅ Added group: ${cmd.name} (${cmd.id})`)
  })

program.parse()
