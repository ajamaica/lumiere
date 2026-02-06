#!/usr/bin/env node
/**
 * Claw Control Dashboard Updater
 * Updates agent status and posts messages to the dashboard
 *
 * Usage:
 *   node update_dashboard.js --agent "Goku" --status "working" --message "Starting task..."
 *   node update_dashboard.js --agent "Bulma" --status "idle" --message "Task complete!"
 */

const CLAW_CONTROL_URL = process.env.CLAW_CONTROL_URL || 'http://localhost:3001'
const API_KEY = process.env.CLAW_CONTROL_API_KEY || ''

// Agent name → ID mapping
// Customize this for your team!
const AGENT_MAPPING = {
  // Dragon Ball Z theme (default)
  Goku: 1,
  goku: 1,
  Vegeta: 2,
  vegeta: 2,
  Bulma: 3,
  bulma: 3,
  Gohan: 4,
  gohan: 4,
  Piccolo: 5,
  piccolo: 5,
  Trunks: 6,
  trunks: 6,

  // Generic fallbacks
  coordinator: 1,
  backend: 2,
  devops: 3,
  research: 4,
  architecture: 5,
  deployment: 6,
}

function parseArgs(args) {
  const result = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      // Check for --key=value format
      if (arg.includes('=')) {
        const [k, ...v] = arg.slice(2).split('=')
        result[k] = v.join('=')
      } else {
        // Check for --key value format
        result[key] = args[i + 1]
        i++
      }
    }
  }
  return result
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const { agent, status, message } = args

  if (!agent) {
    console.error(
      'Usage: node update_dashboard.js --agent "Name" [--status "working|idle"] [--message "..."]',
    )
    console.error(
      '\nAvailable agents:',
      Object.keys(AGENT_MAPPING)
        .filter((k) => k[0] === k[0].toUpperCase())
        .join(', '),
    )
    process.exit(1)
  }

  const agentId = AGENT_MAPPING[agent] || AGENT_MAPPING[agent.toLowerCase()]
  if (!agentId) {
    console.error(`Unknown agent: ${agent}`)
    console.error(
      'Known agents:',
      Object.keys(AGENT_MAPPING)
        .filter((k) => k[0] === k[0].toUpperCase())
        .join(', '),
    )
    process.exit(1)
  }

  const headers = { 'Content-Type': 'application/json' }
  if (API_KEY) {
    headers['x-api-key'] = API_KEY
  }

  try {
    // Update agent status if provided
    if (status) {
      const validStatuses = ['idle', 'working', 'error', 'offline']
      if (!validStatuses.includes(status)) {
        console.error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
        process.exit(1)
      }

      const res = await fetch(`${CLAW_CONTROL_URL}/api/agents/${agentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error(`Failed to update status: ${err}`)
      } else {
        console.log(`✓ ${agent} status → ${status}`)
      }
    }

    // Post message if provided
    if (message) {
      const res = await fetch(`${CLAW_CONTROL_URL}/api/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent_id: agentId,
          message: message,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error(`Failed to post message: ${err}`)
      } else {
        console.log(`✓ Posted: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)
      }
    }

    if (!status && !message) {
      console.log(`Agent ${agent} (ID: ${agentId}) - no action specified`)
      console.log('Use --status and/or --message to update')
    }
  } catch (err) {
    console.error('Error connecting to Claw Control:', err.message)
    console.error(`Make sure CLAW_CONTROL_URL is set correctly: ${CLAW_CONTROL_URL}`)
    process.exit(1)
  }
}

main()
