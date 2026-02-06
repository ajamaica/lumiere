const { program } = require('commander')
const Lark = require('@larksuiteoapi/node-sdk')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const APP_ID = process.env.FEISHU_APP_ID
const APP_SECRET = process.env.FEISHU_APP_SECRET

if (!APP_ID || !APP_SECRET) {
  console.error('Error: FEISHU_APP_ID or FEISHU_APP_SECRET not set.')
  process.exit(1)
}

const client = new Lark.Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
})

program
  .option('-l, --limit <number>', 'Number of tasks to list', '20')
  .option('--json', 'Output as JSON')
  .parse(process.argv)

const options = program.opts()

async function listTasks() {
  try {
    const res = await client.task.task.list({
      params: {
        page_size: parseInt(options.limit),
        user_id_type: 'open_id',
      },
    })

    if (res.code !== 0) {
      console.error(`❌ API Error: ${res.msg}`)
      process.exit(1)
    }

    const tasks = res.data.items || []

    if (options.json) {
      console.log(JSON.stringify(tasks, null, 2))
      return
    }

    if (tasks.length === 0) {
      console.log('No tasks found.')
      return
    }

    console.log(`Found ${tasks.length} tasks:`)
    tasks.forEach((task) => {
      const status = task.completed_at ? '✅' : '⬜'

      let dueStr = ''
      if (task.due && task.due.time) {
        const d = new Date(parseInt(task.due.time) * 1000)
        dueStr = `(Due: ${d.toISOString().replace('T', ' ').substring(0, 16)})`
      }

      console.log(`${status} [${task.id}] ${task.summary} ${dueStr}`)
      console.log(`   Link: ${task.app_link}`)
    })
  } catch (e) {
    console.error('Error:', e.message)
    if (e.response) console.error('Data:', JSON.stringify(e.response.data))
  }
}

listTasks()
