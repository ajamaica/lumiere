/**
 * Create Wallet Set - Sandbox Mode
 */

const {
  initiateDeveloperControlledWalletsClient,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

async function main() {
  console.log('=== Creating Wallet Set (Sandbox) ===\n')

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
      entitySecret: ENTITY_SECRET,
      baseUrl: 'https://api-sandbox.circle.com', // Explicit sandbox
    })

    console.log('Creating wallet set...')
    const result = await client.createWalletSet({
      name: 'KarmaBank Credit Pool',
    })

    console.log('\n✅ SUCCESS!')
    console.log('Wallet Set ID:', result.data?.walletSet?.id)
    console.log('Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

main()
