/**
 * KarmaBank CLI Entry Point
 * 
 * A command-line interface for the KarmaBank that enables AI agents
 * to borrow USDC based on their Moltbook karma reputation.
 * 
 * Usage:
 *   credit <command> [arguments]
 * 
 * Commands:
 *   register <moltbookName>  Register an agent with credit system
 *   check <moltbookName>    Check credit score and limit
 *   borrow <moltbookName> <amount>  Borrow USDC
 *   repay <moltbookName> <amount>   Repay USDC loan
 *   history <moltbookName>  Show loan history
 *   list                    List all registered agents
 */

import { Command } from 'commander';

import { borrowCommand } from './cli/commands/borrow';
import { checkCommand } from './cli/commands/check';
import { historyCommand } from './cli/commands/history';
import { listCommand } from './cli/commands/list';
import { registerCommand } from './cli/commands/register';
import { repayCommand } from './cli/commands/repay';
import { formatHelp } from './cli/help.js';

/**
 * Main CLI program configuration
 */
const program = new Command();

program
  .name('credit')
  .description('KarmaBank - USDC borrowing based on Moltbook karma')
  .version('1.0.0')
  .helpOption('-h, --help', 'Display help information')
  .addHelpText('after', formatHelp())
  .configureHelp({
    helpWidth: 80,
    subcommandTerm: (cmd) => cmd.name(),
  });

// Register all CLI commands
registerCommand(program);
checkCommand(program);
borrowCommand(program);
repayCommand(program);
historyCommand(program);
listCommand(program);

// Parse command-line arguments
program.parse(process.argv);

// Display help if no arguments provided
if (process.argv.length === 2) {
  program.outputHelp();
}

/**
 * Export program for testing purposes
 */
export { program };
