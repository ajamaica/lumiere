#!/usr/bin/env node

/**
 * Context Optimization Runner
 * Executes the context optimization process using the configuration
 */

const path = require('path')
const ContextOptimizer = require('./optimize.js')

async function runOptimization() {
  try {
    console.log('Initializing context optimizer...')

    // Create optimizer instance with configuration
    const optimizer = new ContextOptimizer(
      '/home/blackworm/.openclaw/workspace',
      'task_processing_config.json',
    )

    // For demonstration purposes, we'll simulate having some messages
    // In a real scenario, this would come from the actual conversation history
    const simulatedMessages = [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'Hello, how are you?' },
      { role: 'assistant', content: 'I am doing well, thank you for asking.' },
      { role: 'user', content: 'Can you help me with something?' },
      { role: 'assistant', content: "Of course! I'd be happy to help you." },
      { role: 'user', content: 'Remember that I prefer morning meetings' },
      { role: 'assistant', content: 'Noted, I will remember that you prefer morning meetings.' },
      { role: 'user', content: 'Also, I like coffee but not tea' },
      { role: 'assistant', content: 'Got it, you like coffee but not tea.' },
      { role: 'user', content: 'Please remember these preferences for future reference' },
    ]

    // Simulate a longer conversation to trigger optimization
    for (let i = 0; i < 30; i++) {
      simulatedMessages.push({
        role: 'user',
        content: `Additional conversation message #${i + 1}. This is important information that might need to be remembered. User preference item ${i}.`,
      })
      simulatedMessages.push({
        role: 'assistant',
        content: `Acknowledged message #${i + 1}. I've noted this information in our conversation.`,
      })
    }

    console.log(`Starting optimization for ${simulatedMessages.length} messages...`)

    // Run the optimization
    const result = optimizer.optimizeContext(simulatedMessages)

    if (result.message) {
      console.log(result.message)
      return
    }

    console.log('\nOptimization completed successfully!')
    console.log(`- Generated ${result.summary.bulletPoints.length} key points`)
    console.log(`- Extracted ${result.summary.factsToRemember.length} facts to remember`)
    console.log(`- Context cleared: ${result.contextCleared}`)
    console.log(`- Old summary files cleaned up: ${result.cleanedCount}`)
    if (result.summaryFile) {
      console.log(`- Summary saved to: ${result.summaryFile}`)
    }

    console.log('\nContext optimization finished.')
  } catch (error) {
    console.error('Error during context optimization:', error)
    process.exit(1)
  }
}

// Run optimization if called directly
if (require.main === module) {
  runOptimization()
}

module.exports = { runOptimization }
