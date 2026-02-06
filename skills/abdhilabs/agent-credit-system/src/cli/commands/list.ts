import { Command } from 'commander';

import { agentRegistry } from '../../models/agent.js';

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

export const listCommand = new Command()
  .name('list')
  .description('List all registered agents')
  .action(async () => {
    console.log('\n=== Registered Agents ===\n');
    
    try {
      const agents = agentRegistry.list();
      
      if (agents.length === 0) {
        console.log('No agents registered yet.');
        console.log('Run: credit register <name>\n');
        return;
      }
      
      console.log('Name'.padEnd(16) + 'Tier'.padEnd(12) + 'Max Borrow'.padEnd(12) + 'Outstanding');
      console.log('-'.repeat(52));
      
      for (const agent of agents) {
        const tier = getTierName(getTierFromScore(agent.creditScore));
        console.log(
          agent.moltbookName?.padEnd(16) +
          tier.padEnd(12) +
          String(agent.creditLimit || 0).padEnd(12) +
          String(agent.outstandingLoan || 0)
        );
      }
      console.log();
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
