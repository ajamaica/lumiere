import { Command } from 'commander';

import { agentRegistry } from '../../models/agent.js';
import { loanLedger } from '../../models/loan.js';

export const historyCommand = new Command()
  .name('history')
  .description('Show loan history for an agent')
  .argument('<name>', 'Agent name')
  .action(async (name: string) => {
    console.log('\n=== Loan History ===\n');
    
    try {
      const agent = agentRegistry.get(name);
      if (!agent) {
        console.log(`Agent "${name}" is not registered.`);
        console.log(`Run: credit register ${name}\n`);
        return;
      }
      
      const loans = loanLedger.getHistory(agent.id);
      
      console.log(`Agent: @${agent.moltbookName}`);
      console.log(`Total Loans: ${loans.length}`);
      console.log(`Outstanding: ${agent.outstandingLoan || 0} USDC\n`);
      
      if (loans.length === 0) {
        console.log('No loan history.\n');
        return;
      }
      
      // Show loans in reverse chronological order
      const sortedLoans = [...loans].reverse();
      
      for (const loan of sortedLoans) {
        const date = new Date(loan.createdAt || Date.now()).toLocaleDateString();
        const dueDate = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A';
        
        console.log(`[${loan.status.toUpperCase()}] ${loan.amount} USDC`);
        console.log(`  Issued: ${date} | Due: ${dueDate}`);
        if (loan.repaidAt) {
          console.log(`  Repaid: ${new Date(loan.repaidAt).toLocaleDateString()}`);
        }
        console.log();
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
