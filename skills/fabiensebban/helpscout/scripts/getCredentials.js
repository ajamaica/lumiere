const config = require('openclaw-config')

// Loads Helpscout API credentials securely
function getCredentials() {
  const apiKey = config.get('helpscout.apiKey')
  const appSecret = config.get('helpscout.appSecret')
  const inboxIds = config.get('helpscout.inboxIds')

  if (!apiKey || !appSecret || !Array.isArray(inboxIds) || inboxIds.length === 0) {
    throw new Error(
      'Invalid Helpscout credentials. Please configure your API key, app secret, and at least one Inbox ID using the OpenClaw config system.',
    )
  }

  return { apiKey, appSecret, inboxIds }
}

module.exports = { getCredentials }
