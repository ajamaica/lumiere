const { fetchWithAuth } = require('../common/feishu-client.js')

async function updateSettings(chatId, options) {
  if (!chatId) throw new Error('Chat ID is required')

  const body = {}

  // 1. Basic Info
  if (options.name) body.name = options.name
  if (options.description) body.description = options.description

  // 2. Permissions (Moderation)
  // edit_permission: all_members | only_owner (Who can edit group info)
  if (options.editPermission) body.edit_permission = options.editPermission

  // at_all_permission: all_members | only_owner (Who can @all)
  if (options.atAllPermission) body.at_all_permission = options.atAllPermission

  // user_invitation_permission: all_members | only_owner (Who can invite)
  if (options.invitePermission) body.user_invitation_permission = options.invitePermission

  // The API for "Muting" is actually implied by permissions or separate settings.
  // Feishu v1 API doesn't have a simple "mute_all" boolean in the update endpoint,
  // but controlling who can post is often what's wanted.
  // However, looking at standard API, 'post_permission' isn't always directly exposed in v1 update-chat for all app types.
  // Let's stick to what we know works for "Settings".

  // Note: True "Mute All" (Post Permission) might be restricted or require different scope.
  // We will implement what's available in the standard PUT /chats/:chat_id endpoint.

  if (Object.keys(body).length === 0) {
    console.log('No settings to update.')
    return
  }

  console.log(`Updating settings for chat ${chatId}...`, body)

  const url = `https://open.feishu.cn/open-apis/im/v1/chats/${chatId}`
  const res = await fetchWithAuth(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()

  if (data.code !== 0) {
    throw new Error(`Failed to update chat: ${data.code} - ${data.msg}`)
  }

  console.log('Success: Settings updated.')
  return data.data
}

// CLI Wrapper
if (require.main === module) {
  const { program } = require('commander')
  program
    .requiredOption('-c, --chat-id <id>', 'Chat ID')
    .option('-n, --name <text>', 'New Chat Name')
    .option('-d, --description <text>', 'New Description (Info/Notice)')
    .option('--edit-permission <type>', 'all_members | only_owner')
    .option('--at-all-permission <type>', 'all_members | only_owner')
    .option('--invite-permission <type>', 'all_members | only_owner')
    .parse(process.argv)

  updateSettings(program.opts().chatId, program.opts()).catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}

module.exports = { updateSettings }
