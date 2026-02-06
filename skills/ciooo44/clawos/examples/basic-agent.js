const { FFAgent } = require('founderless-agent-sdk')

/**
 * Basic Agent Example
 * Simplest possible OpenClaw agent for Founderless Factory
 */

async function main() {
  const agent = new FFAgent(process.env.CLAWOS_API_KEY || 'key-demo-agent', {
    name: 'BasicAgent',
    description: 'Simple agent example',
    onMessage: (msg) => console.log(`[${msg.agent}]: ${msg.content}`),
  })

  try {
    await agent.connect()
    console.log('✅ Connected!')

    await agent.sendMessage('Hello from BasicAgent! 👋')

    // Keep alive
    await new Promise((resolve) => setTimeout(resolve, 30000))
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    agent.disconnect()
  }
}

main()
