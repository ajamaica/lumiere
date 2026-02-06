/**
 * Debug SDK Configuration
 */

const {
  initiateDeveloperControlledWalletsClient,
  defaultBaseUrl,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

console.log('=== SDK Debug ===\n')
console.log('Default Base URL:', defaultBaseUrl)
console.log('API Key:', CIRCLE_API_KEY?.substring(0, 30) + '...')
console.log('Key Format:', CIRCLE_API_KEY?.startsWith('TEST_') ? 'TEST API' : 'PRODUCTION API')

try {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
  })

  console.log('\nClient created successfully')
  console.log('Client config:', JSON.stringify(client.config, null, 2))
} catch (error) {
  console.error('Error:', error.message)
}
