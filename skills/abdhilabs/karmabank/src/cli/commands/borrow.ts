import { Command } from 'commander';

import { 
  disburseLoan, 
  getPoolWallet, 
  isCircleConfigured 
} from '../../adapters/circle.js';
import { agentRegistry } from '../../models/agent.js';

export const borrowCommand = new Command()
  .name('borrow')
  .description('Borrow USDC against your karma')
  .argument('<name>', 'Agent name')
  .argument('<amount>', 'Amount to borrow')
  .action(async (name: string, amountStr: string) => {
    console.log('\n=== Borrow USDC ===\n');
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error('Error: Amount must be a positive number\n');
      return;
    }
    
    try {
      const agent = agentRegistry.get(name);
      if (!agent) {
        console.log(`Agent "${name}" is not registered.`);
        console.log(`Run: credit register ${name}\n`);
        return;
      }
      
      // Check if borrowing is enabled
      if (agent.status !== 'active') {
        console.error('\nError: Borrowing is not enabled for this agent\n');
        return;
      }
      
      // Check for existing loan
      if ((agent.outstandingLoan || 0) > 0) {
        console.error('\nError: You have an outstanding loan');
        console.log(`Outstanding: ${agent.outstandingLoan || 0} USDC\n`);
        return;
      }
      
      // Validate amount
      const available = agentRegistry.getAvailableCredit(name);
      if (amount > available) {
        console.error(`\nError: Amount exceeds your credit limit`);
        console.log(`Max Borrow: ${available} USDC\n`);
        return;
      }
      
      // Check Circle configuration
      if (!isCircleConfigured()) {
        console.error('\n⚠️  Circle not configured - using demo mode\n');
        
        // Mock transfer for demo
        const walletAddress = agent.walletAddress || name;
        console.log(`Transferring ${amount} USDC to ${walletAddress}...`);
        console.log('(Demo mode - no real transfer)\n');
        
        agentRegistry.updateOutstandingLoan(agent.id, amount);
        console.log(`✅ Loan created!`);
        console.log(`   Amount: ${amount} USDC`);
        console.log(`   Due: 14 days\n`);
        return;
      }
      
      // Real Circle transfer - require wallet address
      if (!agent.walletAddress) {
        console.error('\n⚠️  Agent does not have a wallet');
        console.log(`Run: credit wallet:create ${name}\n`);
        return;
      }
      
      const poolWallet = await getPoolWallet();
      
      console.log(`Pool Wallet: ${poolWallet.address}`);
      console.log(`Pool Balance: ${poolWallet.usdcBalance} USDC\n`);
      
      if (poolWallet.usdcBalance < amount) {
        console.error(`Error: Insufficient pool balance`);
        console.log(`Pool has: ${poolWallet.usdcBalance} USDC`);
        console.log(`Requested: ${amount} USDC\n`);
        return;
      }
      
      console.log(`Transferring ${amount} USDC to ${agent.walletAddress}...`);
      
      // Transfer to agent's wallet address
      const result = await disburseLoan(agent.walletAddress, amount, poolWallet.id);
      
      if (result.success || result.status === 'INITIATED') {
        // Update agent ledger
        agentRegistry.updateOutstandingLoan(agent.id, amount);
        
        console.log(`✅ Loan created successfully!`);
        console.log(`   Amount: ${amount} USDC`);
        console.log(`   Transaction ID: ${result.transactionId || 'N/A'}`);
        console.log(`   Status: ${result.status || 'PENDING'}\n`);
      } else {
        console.error(`❌ Transfer failed: ${result.error}\n`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
