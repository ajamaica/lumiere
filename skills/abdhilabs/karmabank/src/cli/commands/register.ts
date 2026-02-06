import { Command } from 'commander';

import { getMoltbookProfile } from '../../adapters/moltbook.js';
import { calculateCreditScore } from '../../scoring.js';
import { agentRegistry,creditLedger } from '../../services/ledger.js';

export const registerCommand = new Command()
  .name('register')
  .description('Register an agent with the credit system')
  .argument('<name>', 'Agent name to register')
  .action(async (name: string) => {
    console.log('\n=== Register Agent ===\n');
    
    try {
      // Check if already registered
      const existing = agentRegistry.get(name);
      if (existing) {
        console.log(`Agent "${name}" is already registered.`);
        console.log(`Run: credit check ${name}\n`);
        return;
      }
      
      // Fetch Moltbook profile
      console.log(`Fetching Moltbook profile for @${name}...`);
      const profile = await getMoltbookProfile(name);
      
      // Calculate credit score
      console.log('Calculating credit score...');
      const score = calculateCreditScore(profile as any);
      
      // Register agent
      const result = creditLedger.registerAgent(
        name,
        score.rawScore,
        score.maxBorrow
      );
      
      if (result.success) {
        console.log(`\n✅ Agent registered successfully!`);
        console.log(`   Name: @${name}`);
        console.log(`   Score: ${score.rawScore.toFixed(1)}/100`);
        console.log(`   Max Borrow: ${score.maxBorrow} USDC\n`);
      } else {
        console.log(`\n❌ Registration failed: ${result.message}\n`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }
  });
