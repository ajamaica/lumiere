const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const { google } = require('googleapis')

const CREDENTIALS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
const TOKENS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const { client_id, client_secret } = credentials.installed

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8888')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  })

  console.log('Open this URL in your browser:')
  console.log(authUrl)
  console.log('\nWaiting for auth code...')

  // Wait for callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true)
      const query = parsedUrl.query

      if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h1>✅ Auth Successful!</h1><p>You can close this window.</p>')
        server.close()
        resolve(query.code)
      } else if (query.error) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(`<h1>❌ Auth Failed: ${query.error}</h1>`)
        server.close()
        reject(new Error(query.error))
      }
    })

    server.listen(8888)

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close()
      reject(new Error('Timeout'))
    }, 120000)
  })

  const { tokens } = await oauth2Client.getToken(code)
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2))
  console.log('✅ Tokens saved!')
  return tokens
}

authenticate().catch(console.error)
