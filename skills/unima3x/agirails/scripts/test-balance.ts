/**
 * AGIRAILS Balance Check Script
 * 
 * Quick test to verify your wallet setup is working.
 * 
 * Usage:
 *   npx ts-node test-balance.ts
 * 
 * Requires:
 *   - AGENT_ADDRESS env var
 *   - @agirails/sdk installed
 */

import { ACTPClient } from '@agirails/sdk';
import { ethers } from 'ethers';

async function main() {
  console.log('🔍 AGIRAILS Balance Check\n');

  // Check env vars
  const address = process.env.AGENT_ADDRESS;
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  const mode = (process.env.AGIRAILS_MODE as 'mock' | 'testnet' | 'mainnet') || 'testnet';

  if (!address) {
    console.error('❌ AGENT_ADDRESS not set');
    process.exit(1);
  }

  console.log(`Address: ${address}`);
  console.log(`Mode: ${mode}\n`);

  try {
    // Initialize client
    const client = await ACTPClient.create({
      mode,
      privateKey: privateKey!,
      requesterAddress: address,
    });

    // Get balance
    const balance = await client.getBalance(address);
    const formattedBalance = ethers.formatUnits(balance, 6);

    console.log(`💰 USDC Balance: $${formattedBalance}`);

    // Check thresholds
    const balanceNum = parseFloat(formattedBalance);
    
    if (balanceNum < 1) {
      console.log('⚠️  Balance very low - fund wallet before testing');
    } else if (balanceNum < 20) {
      console.log('⚠️  Balance below recommended minimum ($20)');
    } else if (balanceNum < 50) {
      console.log('✅ Balance OK for testing');
    } else {
      console.log('✅ Balance good');
    }

    // Get connected network
    console.log(`\n📡 Network: Base ${mode === 'mainnet' ? 'Mainnet' : 'Sepolia'}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('private key')) {
      console.error('\nHint: Make sure AGENT_PRIVATE_KEY is set correctly');
    }
    
    process.exit(1);
  }
}

main();
