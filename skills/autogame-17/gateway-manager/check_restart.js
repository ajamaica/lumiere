const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const WORKSPACE_ROOT = path.resolve(__dirname, '../../')
const ALERT_FILE = path.join(WORKSPACE_ROOT, 'memory/pending_restart_alert.json')

function sendFeedback(targetId, title, text, color = 'green') {
  try {
    const scriptPath = path.join(WORKSPACE_ROOT, 'skills/feishu-card/send.js')
    if (fs.existsSync(scriptPath)) {
      const cmd = `node "${scriptPath}" --target "${targetId}" --title "${title}" --color "${color}"`
      execSync(cmd, {
        input: text,
        stdio: ['pipe', 'ignore', 'ignore'],
        cwd: WORKSPACE_ROOT,
      })
    }
  } catch (e) {
    console.error(`[RestartCheck] Feedback failed: ${e.message}`)
  }
}

function main() {
  if (!fs.existsSync(ALERT_FILE)) {
    return // Nothing to do
  }

  try {
    const content = fs.readFileSync(ALERT_FILE, 'utf8')
    const data = JSON.parse(content)
    const userId = data.userId

    if (userId) {
      console.log(`[RestartCheck] Found pending alert for ${userId}`)
      sendFeedback(
        userId,
        'Gateway Manager',
        '✅ Restart Complete!\nSystem is back online.',
        'green',
      )
    }
  } catch (e) {
    console.error(`[RestartCheck] Error processing alert file: ${e.message}`)
  } finally {
    // Always delete the file to prevent loops
    try {
      fs.unlinkSync(ALERT_FILE)
      console.log(`[RestartCheck] Cleared alert file.`)
    } catch (e) {
      console.error(`[RestartCheck] Failed to delete alert file: ${e.message}`)
    }
  }
}

main()
