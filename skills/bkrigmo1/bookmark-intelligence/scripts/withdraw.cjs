#!/usr/bin/env node
/**
 * Revenue Withdrawal Script
 * SECURITY: Only allows withdrawals to Trust Wallet
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../payment-config.json');
const TRUST_WALLET = '0x544E033D055738e7b5c40AD4318B506e1219E064';

async function withdraw(destinationAddress, amount, token, chain) {
  // Load config
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  // SECURITY CHECK: Only allow Trust Wallet
  if (destinationAddress.toLowerCase() !== TRUST_WALLET.toLowerCase()) {
    throw new Error(`❌ SECURITY VIOLATION: Withdrawals only allowed to Trust Wallet (${TRUST_WALLET}). Attempted: ${destinationAddress}`);
  }
  
  console.log('✅ Security check passed: Destination is Trust Wallet');
  console.log(`\n📤 Withdrawal Request:`);
  console.log(`   Token: ${token}`);
  console.log(`   Amount: ${amount}`);
  console.log(`   Chain: ${chain}`);
  console.log(`   From: ${config.crypto.revenueWallet}`);
  console.log(`   To: ${destinationAddress}`);
  
  // TODO: Implement actual blockchain transfer
  // This would use the crypto-wallet skill to execute the transfer
  console.log('\n⚠️  Actual transfer not yet implemented.');
  console.log('This is a safeguard placeholder - would execute transfer via crypto-wallet skill.');
  
  return {
    success: true,
    destination: destinationAddress,
    amount,
    token,
    chain,
    status: 'dry-run'
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node withdraw.js <amount> <token> <chain>');
    console.log('');
    console.log('Examples:');
    console.log('  node withdraw.js 100 USDC polygon');
    console.log('  node withdraw.js 50 USDT bsc');
    console.log('');
    console.log(`Destination (hardcoded): ${TRUST_WALLET}`);
    process.exit(0);
  }
  
  const [amount, token, chain] = args;
  
  withdraw(TRUST_WALLET, amount, token, chain)
    .then(result => {
      console.log('\n✅ Withdrawal request validated');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Withdrawal failed:', error.message);
      process.exit(1);
    });
}

module.exports = { withdraw, TRUST_WALLET };
