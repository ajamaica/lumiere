const fs = require('fs')
const path = require('path')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

program
  .option('--subject <text>', 'Meeting Subject', 'Xiaobao Meeting')
  .option('--time <iso>', 'Meeting End Time (optional)')
  .option('--owner <id>', 'Owner OpenID')
  .parse(process.argv)

const options = program.opts()

async function getToken() {
  // ... (Same as before)
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'))
    if (cached.expire > Math.floor(Date.now() / 1000) + 60) return cached.token
  }
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  })
  const data = await res.json()
  fs.writeFileSync(
    TOKEN_CACHE_FILE,
    JSON.stringify({
      token: data.tenant_access_token,
      expire: Math.floor(Date.now() / 1000) + data.expire,
    }),
  )
  return data.tenant_access_token
}

async function reserveMeeting() {
  const token = await getToken()
  const ownerId = options.owner || process.env.OPENCLAW_MASTER_ID

  // Fix Param Error: 'end_time' is required and must be string timestamp (seconds)
  const d = new Date()
  d.setHours(d.getHours() + 1)
  const endTime = Math.floor(d.getTime() / 1000).toString()

  console.log(`Reserving meeting: "${options.subject}" for Owner: ${ownerId}...`)

  const payload = {
    end_time: endTime, // Required
    owner_id: ownerId, // Required
    meeting_settings: {
      topic: options.subject,
    },
  }

  console.log('Payload:', JSON.stringify(payload, null, 2))

  const res = await fetch(
    `https://open.feishu.cn/open-apis/vc/v1/reserves/apply?user_id_type=open_id`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )

  const data = await res.json()

  if (data.code !== 0) {
    console.error('Reserve Failed:', JSON.stringify(data, null, 2))
  } else {
    const meeting = data.data // data.data contains reserve info directly? Or data.data.meeting?
    // Note: apply endpoint returns 'reserve' object usually.
    console.log('✅ Reserve Success!')
    console.log(`Meeting URL: ${meeting.url}`)
    console.log(`Reserve ID: ${meeting.id}`)
    // Log full object to be sure
    console.log(JSON.stringify(meeting, null, 2))
  }
}

reserveMeeting()
