const {
  initiateDeveloperControlledWalletsClient,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

async function test() {
  console.log('=== Detailed SDK Test ===\n')

  try {
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
    })

    console.log(
      'Client config:',
      JSON.stringify(client, Object.getOwnPropertyNames(client).slice(0, 5), null, 2),
    )

    // Try listing wallet sets
    console.log('\nTrying listWalletSets...')
    const result = await client.listWalletSets()
    console.log('Success:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

test()
