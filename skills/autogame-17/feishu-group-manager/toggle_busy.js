const { fetchWithAuth } = require('../common/feishu-client.js')

const BUSY_PREFIX = '[⏳] '

async function toggleBusy(chatId, mode = null) {
  if (!chatId) throw new Error('Chat ID is required')

  // 1. Get Current Chat Info
  console.log(`Fetching info for chat ${chatId}...`)
  const infoUrl = `https://open.feishu.cn/open-apis/im/v1/chats/${chatId}`
  const infoRes = await fetchWithAuth(infoUrl, { method: 'GET' })
  const infoData = await infoRes.json()

  if (infoData.code !== 0) {
    throw new Error(`Failed to get chat info: ${infoData.msg}`)
  }

  const currentName = infoData.data.name
  const isBusy = currentName.startsWith(BUSY_PREFIX)

  console.log(`Current Name: "${currentName}" (Busy: ${isBusy})`)

  let newName = currentName
  let action = 'none'

  // 2. Determine Action
  if (mode === 'busy') {
    if (!isBusy) {
      newName = BUSY_PREFIX + currentName
      action = 'set_busy'
    }
  } else if (mode === 'idle') {
    if (isBusy) {
      newName = currentName.substring(BUSY_PREFIX.length)
      action = 'set_idle'
    }
  } else {
    // Toggle
    if (isBusy) {
      newName = currentName.substring(BUSY_PREFIX.length)
      action = 'set_idle'
    } else {
      newName = BUSY_PREFIX + currentName
      action = 'set_busy'
    }
  }

  if (action === 'none') {
    console.log('No change needed.')
    return
  }

  // 3. Update Chat Name
  console.log(`Updating name to: "${newName}"...`)
  const updateUrl = `https://open.feishu.cn/open-apis/im/v1/chats/${chatId}`
  const updateRes = await fetchWithAuth(updateUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  })
  const updateData = await updateRes.json()

  if (updateData.code !== 0) {
    // Common error: 1061046 (No permission to update)
    throw new Error(`Failed to update chat name: ${updateData.code} - ${updateData.msg}`)
  }

  console.log('Success.')
  return { oldName: currentName, newName: newName, action }
}

// CLI Wrapper
if (require.main === module) {
  const { program } = require('commander')
  program
    .requiredOption('-c, --chat-id <id>', 'Chat ID')
    .option('-m, --mode <mode>', 'busy | idle (default: toggle)')
    .parse(process.argv)

  const opts = program.opts()
  toggleBusy(opts.chatId, opts.mode).catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}

module.exports = { toggleBusy }
