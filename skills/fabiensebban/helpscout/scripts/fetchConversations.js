const fetch = require('node-fetch')
const { getToken } = require('./getToken')

// Fetch conversations from a specific inbox
async function fetchConversations(inboxId) {
  const token = await getToken()

  const response = await fetch(`https://api.helpscout.net/v2/conversations?mailbox=${inboxId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`)
  }

  const conversations = await response.json()
  return conversations
}

module.exports = { fetchConversations }
