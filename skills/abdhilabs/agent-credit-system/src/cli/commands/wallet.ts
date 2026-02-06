import { Command } from 'commander';

import { createAgentWallet } from '../../adapters/circle.js';
import { agentRegistry } from '../../models/agent.js';

export const walletCommand = new Command()
  .name('wallet')
  .description('Manage agent wallet addresses')
  .addCommand(
    new Command()
      .name('create')
      .description('Create a Circle wallet for an agent')
      .argument('<name>', 'Agent name')
      .action(async (name: string) => {
        console.log('\n=== Create Wallet ===\n');
        
        try {
          const agent = agentRegistry.get(name);
          if (!agent) {
            console.log(`Agent "${name}" is not registered.`);
            console.log(`Run: credit register ${name}\n`);
            return;
          }
          
          // Check if agent already has a wallet
          if (agent.walletAddress) {
            console.log(`Agent "${name}" already has a wallet:`);
            console.log(`  Address: ${agent.walletAddress}\n`);
            return;
          }
          
          console.log(`Creating wallet for agent "${name}"...`);
          
          // Create wallet via Circle adapter
          const wallet = await createAgentWallet(name);
          
          // Update agent with wallet address and ID
          agentRegistry.update(agent.id, { 
            walletAddress: wallet.address,
            walletId: wallet.id 
          });
          
          console.log(`✅ Wallet created successfully!`);
          console.log(`  Wallet ID: ${wallet.id}`);
          console.log(`  Address: ${wallet.address}`);
          console.log(`  Chain: ${wallet.chain}`);
          console.log(`  Balance: ${wallet.usdcBalance} USDC\n`);
        } catch (error: any) {
          console.error(`\n❌ Error: ${error.message}\n`);
        }
      })
  )
  .addCommand(
    new Command()
      .name('address')
      .description('Get wallet address for an agent')
      .argument('<name>', 'Agent name')
      .action(async (name: string) => {
        console.log('\n=== Wallet Address ===\n');
        
        try {
          const agent = agentRegistry.get(name);
          if (!agent) {
            console.log(`Agent "${name}" is not registered.\n`);
            return;
          }
          
          if (agent.walletAddress) {
            console.log(`Agent "${name}" wallet:`);
            console.log(`  ${agent.walletAddress}\n`);
          } else {
            console.log(`Agent "${name}" does not have a wallet.`);
            console.log(`Run: credit wallet:create ${name}\n`);
          }
        } catch (error: any) {
          console.error(`\n❌ Error: ${error.message}\n`);
        }
      })
  );
