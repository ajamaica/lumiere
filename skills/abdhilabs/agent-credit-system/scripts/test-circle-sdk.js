/**
 * Test Circle SDK directly
 */

const {
  initiateDeveloperControlledWalletsClient,
  generateEntitySecret,
  generateEntitySecretCiphertext,
} = require('@circle-fin/developer-controlled-wallets')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

async function test() {
  if (!CIRCLE_API_KEY) {
    console.error('❌ No API key')
    return
  }

  console.log('API Key:', CIRCLE_API_KEY.substring(0, 30) + '...\n')

  try {
    // Generate entity secret (no API call needed)
    console.log('1. Generating entity secret...')
    generateEntitySecret()
    console.log('   ✅ Done\n')

    // Create client and try to get public key
    console.log('2. Creating client...')
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
    })
    console.log('   ✅ Client created\n')

    // Try to get public key
    console.log('3. Getting public key...')
    try {
      const publicKey = await client.getPublicKey()
      console.log('   ✅ Public Key:', publicKey?.substring(0, 50) + '...\n')
    } catch (e) {
      console.log('   ❌ Error:', e.message, '\n')
    }

    // Try generate ciphertext
    console.log('4. Generating ciphertext...')
    try {
      const ciphertext = await generateEntitySecretCiphertext({
        apiKey: CIRCLE_API_KEY,
      })
      console.log('   ✅ Ciphertext:', ciphertext?.substring(0, 50) + '...\n')
    } catch (e) {
      console.log('   ❌ Error:', e.message, '\n')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

test()
