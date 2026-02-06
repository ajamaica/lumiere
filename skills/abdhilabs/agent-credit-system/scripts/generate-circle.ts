/**
 * Generate Circle Entity Secret Ciphertext
 */

import { generateEntitySecretCiphertext,initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';

dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

async function main() {
  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY not set');
    process.exit(1);
  }

  console.log('=== Circle Entity Secret Generator ===\n');
  console.log('API Key:', CIRCLE_API_KEY.substring(0, 30) + '...\n');

  try {
    // Generate entity secret ciphertext
    console.log('Generating entity secret ciphertext...');
    
    const client = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
    });

    const result = await client.generateEntitySecretCiphertext();
    
    console.log('\n✅ Success!');
    console.log('\nEntity Secret Ciphertext:');
    console.log(result.data?.entitySecretCiphertext || result.entitySecretCiphertext);
    
    console.log('\n📋 Next steps:');
    console.log('1. Copy the ciphertext above');
    console.log('2. Go to Circle Dashboard → Wallet Settings');
    console.log('3. Register the entity secret ciphertext');
    console.log('4. Save the resulting secret to CIRCLE_ENTITY_SECRET in .env');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tips:');
    console.log('- Make sure Developer Controlled Wallets is enabled');
    console.log('- Your API key needs proper permissions');
  }
}

main();
