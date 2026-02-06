const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

const CREDENTIALS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
const TOKENS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')

// Auth code from the screenshot URL
const AUTH_CODE = '4/0ASc3gC1NZRG2E3EA-MKZgvg16DEWOEjIm7e1KWxNbJ3xQT_zieDFsFBz1YgJoLHbJi-h_Q'

async function exchangeCodeForTokens() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const { client_id, client_secret } = credentials.installed

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8888')

  console.log('Exchanging auth code for tokens...')

  try {
    const { tokens } = await oauth2Client.getToken(AUTH_CODE)

    console.log('✅ Tokens received!')
    console.log('Access token:', tokens.access_token.substring(0, 20) + '...')
    console.log('Refresh token:', tokens.refresh_token ? 'Present' : 'Missing')

    // Save tokens
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2))
    console.log('✅ Tokens saved to:', TOKENS_FILE)

    // Now upload the video
    await uploadVideo(tokens)
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function uploadVideo(tokens) {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const { client_id, client_secret } = credentials.installed

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8888')

  oauth2Client.setCredentials(tokens)

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  const videoPath = '/Users/ericwoodard/Desktop/devotionals/devotional-with-title.mp4'

  console.log('\n📹 Starting video upload...')

  const response = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: 'Daily Devotional - Finding Peace When the World Feels Uncertain | Psalm 46:1-3',
        description: `Today's headlines remind us that we live in an uncertain world. Tragedies happen, circumstances shift, and the unexpected becomes reality.

But Scripture offers us a different perspective. The psalmist declares that even if the mountains fall into the sea, we need not fear. Why? Because God is not only our refuge—He is our strength.

🌅 Daily Devotional - Feb 4, 2026
📖 Psalm 46:1-3

Subscribe for daily devotionals!`,
        tags: ['devotional', 'daily devotion', 'psalm 46', 'faith', 'christian', 'bible'],
        categoryId: '22',
      },
      status: {
        privacyStatus: 'unlisted',
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  })

  const videoId = response.data.id
  console.log('\n✅ Upload complete!')
  console.log(`📺 Video ID: ${videoId}`)
  console.log(`🔗 Link: https://youtube.com/watch?v=${videoId}`)
}

exchangeCodeForTokens().catch(console.error)
