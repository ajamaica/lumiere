const fs = require('fs')
const path = require('path')
const { program } = require('commander')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET
const TOKEN_CACHE_FILE = path.resolve(__dirname, '../../memory/feishu_token.json')

program
  .option('--id <id>', 'Reservation ID or Meeting ID')
  .option('--users <ids>', 'Comma-separated User IDs to invite')
  .option('--type <type>', 'id type: reserve or meeting', 'reserve')
  .parse(process.argv)

const options = program.opts()

async function getToken() {
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

async function invite() {
  const token = await getToken()
  const id = options.id
  const users = options.users.split(',').map((u) => ({ id: u, user_type: 1 })) // 1=Feishu User

  console.log(`Inviting users to ${options.type} ${id}...`)

  let url
  if (options.type === 'reserve') {
    // Update reservation to add participants
    // PUT /open-apis/vc/v1/reserves/{reserve_id}
    // payload: { meeting_settings: { attendees: [...] } }
    // Wait, 'attendees' is usually the field.

    url = `https://open.feishu.cn/open-apis/vc/v1/reserves/${id}?user_id_type=open_id`
    const payload = {
      meeting_settings: {
        participants: users, // Check API doc for exact field. usually 'participants' or 'attendees'
      },
    }
    // Let's try 'participants' first.

    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
  }
}

invite()
