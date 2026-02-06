const fetch = require('node-fetch')
const { getCredentials } = require('./getCredentials')

// Fetch Helpscout OAuth token
async function getToken() {
  const { apiKey, appSecret } = getCredentials()

  const response = await fetch('https://api.helpscout.net/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: appSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get Helpscout token: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

module.exports = { getToken }
