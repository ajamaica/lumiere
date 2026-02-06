const { program } = require('commander')
const Lark = require('@larksuiteoapi/node-sdk')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

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
  .requiredOption('--summary <text>', 'Task Title')
  .option('--desc <text>', 'Task Description')
  .option('--due <time>', 'Due time (YYYY-MM-DD HH:mm)')
  .option('--assignees <ids>', 'Comma-separated OpenIDs of executors')
  .option('--origin <text>', 'Origin info (optional)')
  .parse(process.argv)

const options = program.opts()

async function createTask() {
  try {
    // 1. Create Task
    const taskData = {
      summary: options.summary,
      description: options.desc || '',
      origin: {
        platform_i18n_name: JSON.stringify({
          zh_cn: 'OpenClaw Assistant',
          en_us: 'OpenClaw Assistant',
        }),
        href: {
          url: options.origin || 'https://open.feishu.cn',
          title: options.summary,
        },
      },
    }

    if (options.due) {
      // Fix: Handle Timezone correctly.
      // Environment is UTC. User input usually implies Shanghai Time (UTC+8).
      // new Date("2023-01-01 10:00") -> 10:00 UTC.
      // We want 10:00 Shanghai -> 02:00 UTC.
      // So we subtract 8 hours if no timezone is explicitly provided.

      let dateObj = new Date(options.due)
      let dueTs = Math.floor(dateObj.getTime() / 1000)

      if (isNaN(dueTs)) {
        console.error(`❌ Invalid Date format: ${options.due}`)
        process.exit(1)
      }

      // Heuristic: If string doesn't contain "+" or "Z", assume local (Shanghai) intent.
      if (!options.due.includes('+') && !options.due.includes('Z')) {
        dueTs -= 8 * 3600
      }

      taskData.due = {
        time: String(dueTs),
        timezone: 'Asia/Shanghai',
        is_all_day: false,
      }

      // Debug log to confirm interpretation
      const checkDate = new Date(dueTs * 1000)
      console.log(
        `   Parsed Due Date: ${checkDate.toISOString()} (UTC) => ${options.due} (Shanghai/Local)`,
      )
    }

    console.log(`Creating task: "${options.summary}"...`)
    const createRes = await client.task.task.create({
      data: taskData,
    })

    if (createRes.code !== 0) {
      console.error(`❌ Failed to create task: ${createRes.msg}`)
      process.exit(1)
    }

    const task = createRes.data.task
    const taskId = task.id
    console.log(`✅ Task Created: ${taskId}`)
    console.log(`   Link: ${task.app_link}`)

    // 2. Add Assignees (Collaborators) - Parallelized
    if (options.assignees) {
      const assignees = options.assignees
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s)
      console.log(`   Adding ${assignees.length} assignees...`)

      const results = await Promise.allSettled(
        assignees.map(async (userId) => {
          const collabRes = await client.task.taskCollaborator.create({
            path: { task_id: taskId },
            params: { user_id_type: 'open_id' },
            data: { id: userId },
          })
          if (collabRes.code !== 0) {
            throw new Error(`${userId}: ${collabRes.msg}`)
          }
          return userId
        }),
      )

      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          console.log(`   ✅ Added assignee: ${res.value}`)
        } else {
          console.error(`   ❌ Failed to add assignee: ${res.reason.message}`)
        }
      })
    }

    console.log(`🎉 Task Setup Complete!`)
  } catch (e) {
    console.error('Error:', e.message)
    if (e.response) console.error('Data:', JSON.stringify(e.response.data))
  }
}

createTask()
