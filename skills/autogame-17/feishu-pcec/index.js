const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Path to Feishu Card sender
const FEISHU_SENDER = path.resolve(__dirname, '../feishu-card/send.js')

async function run() {
  console.log('🚀 Launching Enhanced Evolution Protocol (Feishu Edition)...')

  try {
    // Set environment variable to trigger Feishu-specific prompt in core evolver
    process.env.EVOLVE_REPORT_TOOL = 'feishu-card'

    // Run the core evolution logic
    await require('../capability-evolver/evolve').run()
  } catch (e) {
    console.error('Evolution failed:', e)
    try {
      const errorFile = path.resolve(__dirname, 'evolution_error.log')
      let errorMsg = `🧬 **Evolution Critical Failure**\n\n**Error**: ${e.message}\n\n\`\`\`\n${e.stack}\n\`\`\``

      fs.writeFileSync(errorFile, errorMsg)

      // Attempt to send failure notification
      execSync(
        `node "${FEISHU_SENDER}" --title "Evolution Failed" --color red --text-file "${errorFile}"`,
        { stdio: 'inherit' },
      )
    } catch (sendErr) {
      console.error('Failed to send error report:', sendErr)
    }
  }
}

run()
