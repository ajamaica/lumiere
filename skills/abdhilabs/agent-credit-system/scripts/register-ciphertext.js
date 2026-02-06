/**
 * Register Entity Secret Ciphertext
 */

const { generateEntitySecretCiphertext } = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

async function main() {
  if (!CIRCLE_API_KEY || !ENTITY_SECRET) {
    console.error('❌ Missing credentials')
    return
  }

  console.log('=== Registering Entity Secret Ciphertext ===\n')

  try {
    console.log('Calling generateEntitySecretCiphertext...')
    const result = await generateEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
      entitySecret: ENTITY_SECRET,
    })

    console.log('\n✅ SUCCESS!')
    console.log('Ciphertext:', result)

    console.log('\n📋 Next Steps:')
    console.log('1. Copy the ciphertext above')
    console.log('2. Go to Circle Dashboard → Wallet Settings')
    console.log('3. Register the ciphertext')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

main()
