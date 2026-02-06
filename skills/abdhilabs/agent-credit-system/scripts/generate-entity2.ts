/**
 * Generate Circle Entity Secret - Custom version
 */

import { generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

async function main() {
  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY not set in .env');
    process.exit(1);
  }

  console.log('=== Circle Entity Secret Generator ===\n');
  console.log('API Key:', CIRCLE_API_KEY.substring(0, 30) + '...\n');

  try {
    // Step 1: Generate our own 32-byte entity secret (hex format)
    console.log('1. Generating entity secret (32-byte hex)...');
    const entitySecret = crypto.randomBytes(32).toString('hex');
    console.log(`   ✅ Generated: ${entitySecret.substring(0, 32)}...\n`);

    // Step 2: Generate and register ciphertext using SDK
    console.log('2. Registering with Circle...');
    const ciphertext = await generateEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
      entitySecret,
    });

    console.log('   ✅ Registered!\n');

    // Output results
    console.log('=== RESULTS ===\n');
    console.log('Entity Secret (SAVE THIS!):');
    console.log(entitySecret);
    console.log('\nEntity Secret Ciphertext (from Circle):');
    console.log(ciphertext);
    
    console.log('\n📋 UPDATE .env:');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}\n`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
