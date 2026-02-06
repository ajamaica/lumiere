#!/usr/bin/env node
import minimist from 'minimist'

import { VastSkill } from './adapter'

async function main() {
  const args = minimist(process.argv.slice(2))
  const action = args._[0]

  if (!action) {
    console.error('Usage: node cli.js <action> [params]')
    console.error('Actions: search, rent, connect, balance')
    process.exit(1)
  }

  const apiKey = process.env.VAST_API_KEY
  if (!apiKey) {
    console.error('Error: VAST_API_KEY environment variable is required.')
    process.exit(1)
  }

  // Construct params from flags
  const params: any = { ...args }
  delete params._ // Remove the command name from params

  // Normalize specific params if needed (e.g. price to number)
  if (params.price) params.price = parseFloat(params.price)
  if (params.id) params.id = parseInt(params.id, 10)

  try {
    const result = await VastSkill.execute(action, params, { API_KEY: apiKey })
    console.log(JSON.stringify(result, null, 2))
  } catch (error: any) {
    console.error('Error executing action:', error.message || error)
    // Print full error if verbose
    if (process.env.DEBUG) console.error(error)
    process.exit(1)
  }
}

main()
