const {
  initiateDeveloperControlledWalletsClient,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

async function test() {
  console.log('=== Simple Wallet Set Test ===\n')

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
  })

  try {
    const result = await client.createWalletSet({
      name: 'KarmaBank Credit Pool',
    })

    console.log('✅ SUCCESS!')
    console.log('Wallet Set ID:', result.data?.walletSet?.id)
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data))
    }
  }
}

test()
