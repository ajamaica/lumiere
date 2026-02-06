const https = require('https')

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY
const CONNECTED_ACCOUNT_ID = 'aa5460b3-4171-4a38-a3c2-791abb3849ec' // Gmail

const options = {
  hostname: 'backend.composio.dev',
  port: 443,
  path: '/api/v1/actions/GMAIL_SEARCH_EMAIL/execute',
  method: 'POST',
  headers: {
    'x-api-key': COMPOSIO_API_KEY,
    'Content-Type': 'application/json',
  },
}

const data = JSON.stringify({
  connectedAccountId: CONNECTED_ACCOUNT_ID,
  input: {
    maxResults: 5,
    query: '',
  },
})

const req = https.request(options, (res) => {
  let responseData = ''

  res.on('data', (chunk) => {
    responseData += chunk
  })

  res.on('end', () => {
    console.log(JSON.stringify(JSON.parse(responseData), null, 2))
  })
})

req.on('error', (error) => {
  console.error('Error:', error)
})

req.write(data)
req.end()
