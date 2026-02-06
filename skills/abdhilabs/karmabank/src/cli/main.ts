/**
 * KarmaBank CLI - Main Entry Point
 * 
 * Usage:
 *   credit <command> [arguments]
 * 
 * Commands:
 *   register <name>  Register an agent with credit system
 *   check <name>     Check credit score and limit
 *   borrow <name> <amount>  Borrow USDC
 *   repay <name> <amount>  Repay USDC loan
 *   history <name>   Show loan history
 *   list             List all registered agents
 */

import { Command } from 'commander';

import { borrowCommand } from './commands/borrow.js';
import { checkCommand } from './commands/check.js';
import { historyCommand } from './commands/history.js';
import { listCommand } from './commands/list.js';
import { registerCommand } from './commands/register.js';
import { repayCommand } from './commands/repay.js';
import { walletCommand } from './commands/wallet.js';

/**
 * Main CLI program
 */
async function main() {
  const program = new Command();
  
  program
    .name('credit')
    .description('KarmaBank - USDC borrowing based on Moltbook karma')
    .version('1.0.0')
    .addCommand(registerCommand)
    .addCommand(checkCommand)
    .addCommand(borrowCommand)
    .addCommand(repayCommand)
    .addCommand(historyCommand)
    .addCommand(listCommand)
    .addCommand(walletCommand);
  
  await program.parseAsync(process.argv);
}

main().catch(console.error);
