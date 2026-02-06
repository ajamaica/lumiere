import { Command } from 'commander';

import { agentRegistry } from '../../models/agent.js';
import { loanLedger } from '../../models/loan.js';

function getTierName(level: number): string {
  const names = ['Blocked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  return names[level] || 'Unknown';
}

function getTierFromScore(score: number): number {
  if (score < 30) return 0;
  if (score < 45) return 1;
  if (score < 60) return 2;
  if (score < 75) return 3;
  if (score < 90) return 4;
  return 5;
}

export const checkCommand = new Command()
  .name('check')
  .description('Check credit score and borrowing limit')
  .argument('<name>', 'Agent name to check')
  .action(async (name: string) => {
    console.log('\n=== Credit Report ===\n');
    
    try {
      const agent = agentRegistry.get(name);
      if (!agent) {
        console.log(`Agent "${name}" is not registered.`);
        console.log(`Run: credit register ${name}\n`);
        return;
      }
      
      const tier = getTierName(getTierFromScore(agent.creditScore));
      const activeLoans = loanLedger.getActiveLoans(agent.id);
      
      console.log(`Name: @${agent.moltbookName}`);
      console.log(`Status: ${agent.status}`);
      console.log(`Score: ${agent.creditScore}/100`);
      console.log(`Tier: ${tier}`);
      console.log(`Max Borrow: ${agent.creditLimit} USDC`);
      console.log(`Outstanding: ${agent.outstandingLoan || 0} USDC`);
      console.log(`Registered: ${agent.registeredAt}\n`);
      
      // Show wallet address if available
      if (agent.walletAddress) {
        console.log(`Wallet: ${agent.walletAddress}`);
        if (agent.walletId) {
          console.log(`Wallet ID: ${agent.walletId}`);
        }
        console.log();
      } else {
        console.log(`Wallet: Not configured (run: credit wallet:create ${name})\n`);
      }
      
      // Show active loans
      if (activeLoans.length > 0) {
        console.log('Active Loans:');
        activeLoans.forEach((loan: any) => {
          console.log(`  - ${loan.amount} USDC (due: ${loan.dueDate || 'N/A'})`);
        });
      }
      console.log();
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
