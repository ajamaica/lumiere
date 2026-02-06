const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

const CREDENTIALS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'credentials.json')
const TOKENS_FILE = path.join(process.env.HOME, '.clawd-youtube', 'tokens.json')

async function uploadVideo() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'))
  const { client_id, client_secret } = credentials.installed

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8888')

  oauth2Client.setCredentials(tokens)

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  })

  const videoPath = '/Users/ericwoodard/Desktop/devotionals/devotional-with-title.mp4'

  console.log('📹 Starting video upload...\n')

  try {
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
          tags: [
            'devotional',
            'daily devotion',
            'psalm 46',
            'faith',
            'christian',
            'bible',
            'prayer',
          ],
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
    console.log('✅ Upload complete!\n')
    console.log(`📺 Video ID: ${videoId}`)
    console.log(`🔗 Link: https://youtube.com/watch?v=${videoId}`)

    return videoId
  } catch (error) {
    console.error('❌ Upload failed:', error.message)
    throw error
  }
}

uploadVideo().catch(console.error)
