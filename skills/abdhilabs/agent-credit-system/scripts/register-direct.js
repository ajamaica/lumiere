const { registerEntitySecretCiphertext } = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

async function test() {
  console.log('=== Register Entity Secret via SDK ===\n')

  try {
    const result = await registerEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
      entitySecret: ENTITY_SECRET,
    })

    console.log('✅ SUCCESS!')
    console.log('Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data))
    }
  }
}

test()
