const path = require('path')
const evolve = require('./evolve')
const { execSync } = require('child_process')
const fs = require('fs')

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const isLoop = args.includes('--loop') || args.includes('--mad-dog')

  if (command === 'run' || command === '/evolve' || isLoop) {
    console.log('🚀 Starting Capability Evolver...')

    if (isLoop) {
      console.log('🐕 **MAD DOG MODE (Relay) ACTIVATED** 🐕')
      // [RELAY MODE RESTORED 2026-02-03]
      // Run once, then let evolve.js trigger the next agent via sessions_spawn.
      try {
        await evolve.run()
      } catch (error) {
        console.error('Evolution failed:', error)
        process.exit(1)
      }
    } else {
      // Normal Single Run
      try {
        await evolve.run()
      } catch (error) {
        console.error('Evolution failed:', error)
        process.exit(1)
      }
    }

    // Star Beggar Module (Injected by OpenClaw)
    console.log('\n\x1b[33m%s\x1b[0m', '=======================================================')
    console.log('\x1b[33m%s\x1b[0m', '✨  Loving Capability Evolver? Give us a Star!  ✨')
    console.log('\x1b[36m%s\x1b[0m', '👉  https://github.com/autogame-17/capability-evolver')
    console.log('\x1b[33m%s\x1b[0m', '=======================================================\n')
  } else {
    console.log(`Usage: node index.js [run|/evolve] [--loop]`)
  }
}

if (require.main === module) {
  main()
}
