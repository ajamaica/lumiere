/**
 * Generate Circle Entity Secret - Working version
 */

import {
  generateEntitySecret,
  generateEntitySecretCiphertext,
} from '@circle-fin/developer-controlled-wallets'
import dotenv from 'dotenv'

dotenv.config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY

async function main() {
  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY not set in .env')
    process.exit(1)
  }

  console.log('=== Circle Entity Secret Generator ===\n')
  console.log('API Key:', CIRCLE_API_KEY.substring(0, 30) + '...\n')

  try {
    // Step 1: Generate entity secret (stores internally)
    console.log('1. Generating entity secret...')
    generateEntitySecret()
    console.log('   ✅ Generated and stored\n')

    // Step 2: Generate and register ciphertext
    console.log('2. Generating entity secret ciphertext...')
    const ciphertext = await generateEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
    })

    console.log('   ✅ Success!\n')

    // Output results
    console.log('=== RESULTS ===\n')
    console.log('Entity Secret Ciphertext:')
    console.log(ciphertext)

    console.log('\n📋 NEXT STEPS:')
    console.log('1. Copy the ciphertext above')
    console.log('2. Go to Circle Dashboard → Wallet Settings')
    console.log('3. Register the entity secret ciphertext')
    console.log('4. Save the resulting secret to CIRCLE_ENTITY_SECRET in .env\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
    }
    process.exit(1)
  }
}

main()
