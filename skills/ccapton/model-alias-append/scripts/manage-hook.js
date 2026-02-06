#!/usr/bin/env node

/**
 * Script to manage the response-alias-injector hook for model-alias-append skill
 */

const fs = require('fs')
const path = require('path')

function updateHookStatus(enable) {
  try {
    // Path to the main config file
    const configPath = path.join(process.env.HOME, '.openclaw/openclaw.json')

    if (!fs.existsSync(configPath)) {
      console.error('Configuration file not found:', configPath)
      return false
    }

    // Read the current config
    const configRaw = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(configRaw)

    // Ensure the hooks structure exists
    if (!config.hooks) {
      config.hooks = {}
    }
    if (!config.hooks.internal) {
      config.hooks.internal = {}
    }
    if (!config.hooks.internal.entries) {
      config.hooks.internal.entries = {}
    }

    // Update the hook status
    if (!config.hooks.internal.entries['response-alias-injector']) {
      config.hooks.internal.entries['response-alias-injector'] = {}
    }

    config.hooks.internal.entries['response-alias-injector'].enabled = enable

    // Write the updated config back
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log(`Hook response-alias-injector ${enable ? 'enabled' : 'disabled'} successfully.`)
    return true
  } catch (error) {
    console.error('Error updating hook status:', error.message)
    return false
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const action = args[0]

if (action === 'enable') {
  updateHookStatus(true)
} else if (action === 'disable') {
  updateHookStatus(false)
} else {
  console.log('Usage: node manage-hook.js [enable|disable]')
  console.log('Enable or disable the response-alias-injector hook')
}
