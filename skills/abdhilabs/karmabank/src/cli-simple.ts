/**
 * Simple CLI Entry Point for KarmaBank
 * 
 * A command-line interface for the Agent Credit System that enables AI agents
 * to borrow USDC based on their Moltbook karma reputation.
 */

import { Command } from 'commander';

import { getMoltbookProfile, MoltbookProfile } from './adapters/moltbook.js';
import { Agent } from './models/agent.js';
import { calculateCreditScore } from './scoring.js';
import { creditLedger } from './services/ledger.js';

// Helper functions
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

async function main() {
  const program = new Command();
  
  program
    .name('credit')
    .description('Agent Credit System - USDC borrowing based on Moltbook karma')
    .version('1.0.0');
  
  // Register command
  program.command('register <name>')
    .description('Register an agent with credit system')
    .action(async (name: string) => {
      console.log('\n=== Register Agent ===\n');
      try {
        // Check if already exists
        const existing = creditLedger.getAgent(name);
        if (existing) {
          console.log(`Agent "${name}" is already registered.`);
          console.log(`Run: credit check ${name}\n`);
          return;
        }
        
        // Fetch Moltbook profile
        console.log(`Fetching Moltbook profile for @${name}...`);
        const profile = await getMoltbookProfile(name);
        
        // Calculate credit score (cast to any to bypass type issues)
        console.log(`Calculating credit score...`);
        const score = calculateCreditScore(profile as any);
        
        // Register agent
        const result = await creditLedger.registerAgent(name, score.rawScore, score.maxBorrow);
        
        if (result.success) {
          console.log(`\n✅ Agent registered successfully!`);
          console.log(`   Name: @${name}`);
          console.log(`   Score: ${score.rawScore.toFixed(1)}/100`);
          console.log(`   Tier: ${getTierName(score.tier)}`);
          console.log(`   Max Borrow: ${score.maxBorrow} USDC\n`);
        } else {
          console.log(`\n❌ Registration failed: ${result.message}\n`);
        }
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
    });
  
  // Check command
  program.command('check <name>')
    .description('Check credit score and borrowing limit')
    .action(async (name: string) => {
      console.log('\n=== Credit Report ===\n');
      try {
        const agentData = creditLedger.getAgent(name);
        if (!agentData) {
          console.log(`Agent "${name}" is not registered.`);
          console.log(`Run: credit register ${name}\n`);
          return;
        }
        
        const agent = agentData.agent;
        console.log(`Name: @${agent.moltbookName}`);
        console.log(`Score: ${agent.creditScore}/100`);
        console.log(`Tier: ${getTierName(getTierFromScore(agent.creditScore))}`);
        console.log(`Max Borrow: ${agent.creditLimit} USDC`);
        console.log(`Outstanding: ${agent.outstandingLoan || 0} USDC\n`);
      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
    });
  
  // List command
  program.command('list')
    .description('List all registered agents')
    .action(async () => {
      console.log('\n=== Registered Agents ===\n');
      const agents = creditLedger.listAgents();
      
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
    });
  
  await program.parseAsync(process.argv);
}

main().catch(console.error);
