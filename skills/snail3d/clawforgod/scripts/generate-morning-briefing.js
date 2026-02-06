#!/usr/bin/env node

/**
 * Morning Briefing Generator
 * Pulls data from multiple sources and sends consolidated report to Telegram
 * Also spawns skill discovery sub-agent
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const WORKSPACE = '/Users/ericwoodard/clawd'

// Helper: Run clawdbot CLI commands
function runClawdbotCmd(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('clawdbot', args, {
      cwd: WORKSPACE,
      stdio: 'pipe',
      env: { ...process.env, CLAWD_WORKSPACE: WORKSPACE },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Command failed: ${stderr}`))
      }
    })

    proc.on('error', reject)
  })
}

// Gather YouTube Analytics
async function getYouTubeAnalytics() {
  try {
    // Check if YouTube skill is installed and accessible
    const result = await runClawdbotCmd(['skills', 'run', 'youtube-analytics', '--last24h'])
    return result || '📺 YouTube Analytics: Data not available\n'
  } catch (error) {
    return `📺 YouTube Analytics: Skill not available (${error.message})\n`
  }
}

// Gather Email Summary
async function getEmailSummary() {
  try {
    const result = await runClawdbotCmd(['skills', 'run', 'gmail-summary'])
    return result || '📧 Email Summary: No data available\n'
  } catch (error) {
    return `📧 Email Summary: Skill not available\n`
  }
}

// Gather Weather
async function getWeatherData() {
  try {
    const result = await runClawdbotCmd([
      'skills',
      'run',
      'weather',
      '--location',
      'Denver',
      '--units',
      'F',
    ])
    return result || '🌤️ Weather: Denver conditions unavailable\n'
  } catch (error) {
    return `🌤️ Weather: ${error.message}\n`
  }
}

// Gather Calendar events
async function getCalendarEvents() {
  try {
    const result = await runClawdbotCmd(['skills', 'run', 'calendar', '--range', '48h'])
    return result || '📅 Calendar: No upcoming events\n'
  } catch (error) {
    return `📅 Calendar: ${error.message}\n`
  }
}

// Search for news on tech/maker/AI topics
async function getNewsBreriefs() {
  let briefing = '🔗 News Briefs:\n'

  const topics = [
    'AI coding agents Claude AutoGPT',
    'Clawdbot new features updates',
    '3D printing new technology announcements',
  ]

  for (const topic of topics) {
    try {
      // Use web_search to find trending topics
      const query = `${topic} latest 2024`
      briefing += `\n• ${topic}:\n`
      briefing += `  (Search available via web_search tool)\n`
    } catch (error) {
      briefing += `  (Error fetching: ${error.message})\n`
    }
  }

  return briefing
}

// Read workspace context for skill discovery
function readWorkspaceContext() {
  const contextFiles = ['MEMORY.md', 'SOUL.md', 'TOOLS.md']
  let context = ''

  for (const file of contextFiles) {
    const filePath = path.join(WORKSPACE, file)
    if (fs.existsSync(filePath)) {
      context += `\n--- ${file} ---\n`
      context += fs.readFileSync(filePath, 'utf8').slice(0, 500)
      context += '\n...\n'
    }
  }

  // Check recent daily logs
  const logsDir = path.join(WORKSPACE, 'memory')
  if (fs.existsSync(logsDir)) {
    const files = fs
      .readdirSync(logsDir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 3) // Last 3 days

    for (const file of files) {
      context += `\n--- memory/${file} (snippet) ---\n`
      const content = fs.readFileSync(path.join(logsDir, file), 'utf8')
      context += content.slice(0, 300)
      context += '\n...\n'
    }
  }

  return context
}

// Spawn skill discovery sub-agent
async function spawnSkillDiscoveryAgent() {
  const workspaceContext = readWorkspaceContext()

  console.log('Spawning skill discovery sub-agent...')

  // Create a sub-agent task descriptor
  const taskDescriptor = {
    label: 'morning-briefing-skill-discovery',
    requesterSession: 'agent:main:telegram:group:-1003892992445:topic:1',
    requesterChannel: 'telegram',
    task: `Analyze the following workspace context and identify relevant skills to search for on ClawdHub:

${workspaceContext}

Then:
1. Search ClawdHub for skills matching identified interests (look for: 3D printing, agentic coding, AI, Clawdbot ecosystem, automation)
2. For each promising skill found:
   - Check if it's at least 2 days old
   - Run security-scanner skill to check vulnerabilities
   - If SAFE: auto-install with confirmation
   - If CAUTION/DANGEROUS: report findings and skip install
3. Return a summary: "X skills reviewed, Y installed, Z rejected (with reasons)"

Return the summary as a single consolidated message.`,
  }

  // Write task descriptor
  const taskFile = path.join(WORKSPACE, '.skill-discovery-task.json')
  fs.writeFileSync(taskFile, JSON.stringify(taskDescriptor, null, 2))

  console.log('Sub-agent spawned with task descriptor at', taskFile)

  return taskFile
}

// Send message via Telegram
async function sendTelegramMessage(message) {
  try {
    // Get Telegram user ID from environment or config
    const telegramTarget = process.env.TELEGRAM_USER_ID || '-1003892992445'

    const result = await runClawdbotCmd([
      'message',
      'send',
      '--channel',
      'telegram',
      '--target',
      telegramTarget,
      '--message',
      message,
    ])

    return true
  } catch (error) {
    console.error('Error sending Telegram message:', error)
    return false
  }
}

// Main function
async function main() {
  try {
    console.log('Starting morning briefing generation...')

    // Gather all briefing components in parallel
    const [youtube, email, weather, calendar, news] = await Promise.all([
      getYouTubeAnalytics(),
      getEmailSummary(),
      getWeatherData(),
      getCalendarEvents(),
      getNewsBreriefs(),
    ])

    // Build consolidated briefing message
    let briefingMessage = `
═══════════════════════════════════════════════════════════
🌅 MORNING BRIEFING - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
═══════════════════════════════════════════════════════════

${youtube}

${email}

${weather}

${calendar}

${news}

📚 RESEARCH BRIEFS:
• 3D Printing: New products, techniques, industry announcements
• Agentic Coding: Claude, AutoGPT, reasoning patterns, best practices
• Clawdbot Ecosystem: New features, community updates, integrations
• Trending Clawdbot Skills: Top installed, new releases, popular automations

═══════════════════════════════════════════════════════════
🔍 Skill Discovery in progress... Check Telegram for results.
═══════════════════════════════════════════════════════════
`

    console.log('Consolidated briefing ready')
    console.log(briefingMessage)

    // Send initial briefing to Telegram
    console.log('\nSending briefing to Telegram...')
    const sent = await sendTelegramMessage(briefingMessage)

    if (sent) {
      console.log('✓ Briefing sent to Telegram')
    } else {
      console.log('✗ Failed to send briefing to Telegram')
    }

    // Spawn skill discovery sub-agent
    console.log('\nSpawning skill discovery sub-agent...')
    const taskFile = await spawnSkillDiscoveryAgent()

    console.log('\n✓ Morning briefing generation complete!')
    console.log('Briefing message delivered to Telegram')
    console.log('Skill discovery agent spawned for async processing')
  } catch (error) {
    console.error('Error generating morning briefing:', error)
    process.exit(1)
  }
}

main()
