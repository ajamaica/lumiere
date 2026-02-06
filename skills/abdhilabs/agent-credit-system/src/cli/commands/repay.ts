import { Command } from 'commander';

import { getPoolWallet, isCircleConfigured, receiveRepayment } from '../../adapters/circle.js';
import { agentRegistry } from '../../models/agent.js';

export const repayCommand = new Command()
  .name('repay')
  .description('Repay a USDC loan')
  .argument('<name>', 'Agent name')
  .argument('<amount>', 'Amount to repay')
  .action(async (name: string, amountStr: string) => {
    console.log('\n=== Repay Loan ===\n');
    
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
      
      const outstanding = agent.outstandingLoan || 0;
      
      if (outstanding <= 0) {
        console.log(`No outstanding loan to repay.\n`);
        return;
      }
      
      if (amount > outstanding) {
        console.log(`Amount exceeds outstanding loan (${outstanding} USDC)\n`);
        return;
      }
      
      // Check if agent has wallet configured
      if (!agent.walletId || !agent.walletAddress) {
        console.log(`Agent "${name}" does not have a wallet configured.`);
        console.log(`Run: credit wallet:create ${name} to set up a wallet first.\n`);
        return;
      }
      
      // Check Circle configuration
      if (!isCircleConfigured()) {
        // Mock repayment for demo
        console.log(`Processing repayment of ${amount} USDC...`);
        console.log('(Demo mode - no real transfer)\n');
        
        const newOutstanding = outstanding - amount;
        agentRegistry.updateOutstandingLoan(agent.id, newOutstanding);
        
        console.log(`✅ Repayment processed!`);
        console.log(`   Paid: ${amount} USDC`);
        console.log(`   Remaining: ${newOutstanding} USDC\n`);
        return;
      }
      
      // Get pool wallet address for repayment destination
      const poolWallet = await getPoolWallet();
      
      console.log(`Processing repayment of ${amount} USDC...`);
      console.log(`From: ${agent.walletAddress}`);
      console.log(`To: ${poolWallet.address}`);
      
      // Execute real Circle transfer from agent's wallet to pool
      const transferResult = await receiveRepayment(
        agent.walletId,
        agent.walletAddress,
        poolWallet.address,
        amount
      );
      
      if (!transferResult.success) {
        console.error(`\n❌ Transfer failed: ${transferResult.error || 'Unknown error'}\n`);
        return;
      }
      
      // Update ledger only after successful transfer
      const newOutstanding = outstanding - amount;
      agentRegistry.updateOutstandingLoan(agent.id, newOutstanding);
      
      console.log(`✅ Repayment successful!`);
      console.log(`   Transaction ID: ${transferResult.transactionId}`);
      console.log(`   Paid: ${amount} USDC`);
      console.log(`   Remaining: ${newOutstanding} USDC\n`);
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
