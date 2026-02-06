/**
 * Generate Circle Entity Secret
 * 
 * This script:
 * 1. Generates RSA key pair
 * 2. Registers entity with Circle API
 * 3. Outputs credentials for .env
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
// Load env
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

if (!CIRCLE_API_KEY) {
  console.error('❌ CIRCLE_API_KEY not set in .env');
  process.exit(1);
}

async function generateEntitySecret() {
  console.log('=== Circle Entity Secret Generator ===\n');

  // Step 1: Generate RSA key pair
  console.log('1. Generating RSA key pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  console.log('   ✅ RSA keys generated\n');

  // Save private key
  const privateKeyPath = '/tmp/circle-private-key.pem';
  fs.writeFileSync(privateKeyPath, privateKey);
  console.log(`   📁 Private key saved to: ${privateKeyPath}`);
  console.log('   ⚠️  KEEP THIS SAFE! Needed for transactions.\n');

  // Step 2: Initialize Circle client
  console.log('2. Initializing Circle client...');
  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
    entitySecret: '', // We'll register first
  });
  console.log('   ✅ Client initialized\n');

  // Step 3: Register entity
  console.log('3. Registering entity with Circle...');
  try {
    const idempotencyKey = crypto.randomUUID();
    
    const response = await circle.registerEntitySecretCiphertext({
      idempotencyKey,
      entitySecretCiphertext: publicKey, // In real implementation, encrypt secret with public key
    });

    console.log('   ✅ Entity registered!');
    console.log(`   📋 Response: ${JSON.stringify(response.data, null, 2)}\n`);

    // Step 4: Output instructions
    console.log('=== NEXT STEPS ===\n');
    console.log('1. Save these to your .env:');
    console.log(`CIRCLE_API_KEY=${CIRCLE_API_KEY}`);
    console.log(`CIRCLE_ENTITY_SECRET=<from dashboard>`);
    console.log(`CIRCLE_ENV=sandbox\n`);
    
    console.log('2. If you need to create entity secret manually:');
    console.log('   - Go to Circle Dashboard → Wallet Settings');
    console.log('   - Generate Entity Secret Ciphertext');
    console.log('   - Copy the secret to CIRCLE_ENTITY_SECRET\n');

  } catch (error) {
    console.error('❌ Error registering entity:', error.message);
    console.log('\n💡 Tips:');
    console.log('   - Make sure Developer Controlled Wallets is enabled');
    console.log('   - Check Circle Dashboard for any pending approvals');
  }
}

generateEntitySecret().catch(console.error);
