#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname,join } from 'path';
import { fileURLToPath } from 'url';

import { apyAction } from './commands/apy.js';
import { createAction } from './commands/create.js';
import { depositAction } from './commands/deposit.js';
import { portfolioAction } from './commands/portfolio.js';
import { statusAction } from './commands/status.js';
import { withdrawAction } from './commands/withdraw.js';
import { getAvailableStrategies } from './config/strategies.js';
import { getAvailableTokens } from './config/tokens.js';
import { MamoError } from './utils/errors.js';
import { Colors, error as logError,setJsonMode } from './utils/logger.js';

// Load .env from the script directory or current directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPaths = [
  join(__dirname, '..', '.env'),
  join(__dirname, '.env'),
  join(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

// Create the CLI program
const program = new Command();

program
  .name('mamo')
  .description('Mamo CLI - DeFi Yield Aggregator (Moonwell on Base)')
  .version('1.0.0')
  .option('--dry-run', 'Simulate transactions without executing')
  .option('--json', 'Output results as JSON')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      setJsonMode(true);
    }
  });

// Create strategy command
program
  .command('create')
  .description('Create a yield strategy on-chain via factory contract')
  .argument('<strategy>', `Strategy type: ${getAvailableStrategies().join(', ')}`)
  .action(async (strategy: string) => {
    const opts = program.opts();
    await createAction(strategy, opts);
  });

// Deposit command
program
  .command('deposit')
  .description('Deposit tokens into a yield strategy')
  .argument('<amount>', 'Amount to deposit')
  .argument('<token>', `Token: ${getAvailableTokens().join(', ')}`)
  .action(async (amount: string, token: string) => {
    const opts = program.opts();
    await depositAction(amount, token, opts);
  });

// Withdraw command
program
  .command('withdraw')
  .description('Withdraw tokens from a yield strategy')
  .argument('<amount>', 'Amount to withdraw (or "all" to withdraw everything)')
  .argument('<token>', `Token: ${getAvailableTokens().join(', ')}`)
  .action(async (amount: string, token: string) => {
    const opts = program.opts();
    await withdrawAction(amount, token, opts);
  });

// Status command
program
  .command('status')
  .description('Show account overview and balances')
  .action(async () => {
    const opts = program.opts();
    await statusAction(opts);
  });

// APY command
program
  .command('apy')
  .description('Show current APY rates')
  .argument('[strategy]', 'Optional: specific strategy to check')
  .action(async (strategy: string | undefined) => {
    const opts = program.opts();
    await apyAction(strategy, opts);
  });

// Portfolio command
program
  .command('portfolio')
  .description('Show portfolio overview with USD values')
  .action(async () => {
    const opts = program.opts();
    await portfolioAction(opts);
  });

// Custom help text with examples
program.addHelpText('after', `
${Colors.bold}Strategies:${Colors.reset}
  usdc_stablecoin    USDC lending/yield
  cbbtc_lending      cbBTC lending
  mamo_staking       MAMO token staking
  eth_lending        ETH lending

${Colors.bold}Tokens:${Colors.reset}
  usdc, cbbtc, mamo, eth

${Colors.bold}Environment:${Colors.reset}
  MAMO_WALLET_KEY    Private key (required for on-chain ops)
  MAMO_RPC_URL       Base RPC URL (default: https://mainnet.base.org)

${Colors.bold}Examples:${Colors.reset}
  mamo create usdc_stablecoin
  mamo deposit 100 usdc
  mamo withdraw 50 usdc
  mamo withdraw all cbbtc
  mamo status
  mamo portfolio
  mamo apy usdc_stablecoin
  mamo --dry-run deposit 100 usdc
  mamo --json status
`);

// Error handling
async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof MamoError) {
      logError(err.message);
      if (err.details) {
        console.error(`${Colors.dim}${JSON.stringify(err.details)}${Colors.reset}`);
      }
    } else if (err instanceof Error) {
      logError(err.message);
      if (process.env['DEBUG']) {
        console.error(err.stack);
      }
    } else {
      logError('An unknown error occurred');
    }
    process.exit(1);
  }
}

void main();
