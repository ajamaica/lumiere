/**
 * Circle Entity Secret Generator (JavaScript version)
 */

const crypto = require('crypto')
const forge = require('node-forge')
const axios = require('axios')
require('dotenv').config()

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY
const CIRCLE_BASE_URL =
  process.env.CIRCLE_ENV === 'production' ? 'https://api.circle.com' : 'https://api.circle.com'

async function main() {
  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY not set in .env')
    process.exit(1)
  }

  console.log('=== Circle Entity Secret Generator ===\n')
  console.log('API Key:', CIRCLE_API_KEY.substring(0, 30) + '...\n')

  try {
    // Step 1: Generate 32-byte hex entity secret
    console.log('1. Generating entity secret (32 bytes)...')
    const entitySecret = crypto.randomBytes(32).toString('hex')
    console.log(`   ✅ Generated: ${entitySecret.substring(0, 32)}...\n`)

    // Step 2: Get entity public key from Circle
    console.log('2. Fetching entity public key from Circle...')
    const publicKeyResponse = await axios.get(`${CIRCLE_BASE_URL}/v1/config/entity/publicKey`, {
      headers: {
        Authorization: `Bearer ${CIRCLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const publicKeyPem = publicKeyResponse.data?.publicKey
    if (!publicKeyPem) {
      throw new Error('No public key in response')
    }
    console.log('   ✅ Got public key\n')

    // Step 3: Encrypt entity secret using RSA-OAEP with SHA-256
    console.log('3. Encrypting entity secret (RSA-OAEP, SHA-256)...')
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem)
    const entitySecretBytes = forge.util.hexToBytes(entitySecret)

    const encryptedData = publicKey.encrypt(entitySecretBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    })

    const ciphertext = forge.util.encode64(encryptedData)
    console.log('   ✅ Encrypted\n')

    // Output results
    console.log('=== RESULTS ===\n')
    console.log('🔐 ENTITY SECRET (SAVE THIS!):')
    console.log(entitySecret)
    console.log('\n📝 ENTITY SECRET CIPHERTEXT:')
    console.log(ciphertext)

    console.log('\n📋 UPDATE .env WITH:')
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}\n`)

    console.log('💡 USAGE:')
    console.log('Use the ciphertext in API requests like:')
    console.log(`POST ${CIRCLE_BASE_URL}/v1/developer/walletSets`)
    console.log('{')
    console.log('  "entitySecretCiphertext": "...' + ciphertext.substring(0, 50) + '..."')
    console.log('}\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2))
    }
    process.exit(1)
  }
}

main()
