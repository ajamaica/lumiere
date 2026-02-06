const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { getAllUsers, sendPost } = require('./lib/api')
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)
const fs = require('fs')

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('title', { type: 'string', description: 'Message Title' })
    .option('text', { type: 'string', description: 'Message Text Content' })
    .option('text-file', { type: 'string', description: 'Read text from file' })
    .option('image', { type: 'string', description: 'Image/Sticker path to send' })
    .option('dry-run', { type: 'boolean', default: false })
    .help().argv

  let textContent = argv.text
  if (argv.textFile && fs.existsSync(argv.textFile)) {
    textContent = fs.readFileSync(argv.textFile, 'utf8')
  }

  if (!textContent && !argv.image) {
    console.error('Error: Must provide --text (or --text-file) or --image.')
    return
  }

  console.log('Fetching user list from Feishu...')
  let users = []
  try {
    users = await getAllUsers()
    console.log(`Found ${users.length} users.`)
  } catch (e) {
    console.error(`Failed to fetch users: ${e.message}`)
    return
  }

  let success = 0
  let failed = 0

  for (const user of users) {
    // Prefer open_id
    const targetId = user.open_id
    const name = user.name

    if (!targetId) {
      console.warn(`Skipping ${name}: No open_id.`)
      continue
    }

    console.log(`Sending to ${name} (${targetId})...`)

    if (argv.dryRun) {
      console.log(`[Dry Run] Would send: Title="${argv.title}", Text="..."`)
      continue
    }

    try {
      // 1. Send Text (if exists)
      if (textContent) {
        // Use the robust `feishu-post` CLI for rich text handling
        // We pass text via a temporary file to avoid shell escaping hell
        const tempFile = `.temp_broadcast_msg_${Date.now()}.txt`
        fs.writeFileSync(tempFile, textContent)

        const cmd = `node skills/feishu-post/send.js --target "${targetId}" --title "${argv.title || ''}" --text-file "${tempFile}"`
        await execPromise(cmd)
        fs.unlinkSync(tempFile)
      }

      // 2. Send Image (if exists)
      if (argv.image) {
        const cmdImg = `node skills/feishu-sticker/send.js --target "${targetId}" --file "${argv.image}"`
        await execPromise(cmdImg)
      }

      console.log(`✅ Sent to ${name}`)
      success++
    } catch (e) {
      console.error(`❌ Failed: ${e.message}`)
      failed++
    }

    // Rate limit: 1s delay
    await sleep(1000)
  }

  console.log(`\nBroadcast Complete. Success: ${success}, Failed: ${failed}`)
}

main()
