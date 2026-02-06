/**
 * Generate Circle Entity Secret - Simple version
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
    // Step 1: Generate entity secret (32-byte hex)
    console.log('1. Generating entity secret...')
    const entitySecret = generateEntitySecret()
    console.log(`   ✅ Generated: ${entitySecret}\n`)

    // Step 2: Generate and register ciphertext
    console.log('2. Generating entity secret ciphertext...')
    const result = await generateEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
      entitySecret,
    })

    console.log('   ✅ Success!\n')

    // Output results
    console.log('=== RESULTS ===\n')
    console.log('Entity Secret (save this!):')
    console.log(entitySecret)
    console.log('\nEntity Secret Ciphertext:')
    console.log(result)

    console.log('\n📋 NEXT STEPS:')
    console.log('1. Entity Secret above = your plaintext secret')
    console.log('2. Save to CIRCLE_ENTITY_SECRET in .env')
    console.log('3. Use this to create wallets and transfers\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
