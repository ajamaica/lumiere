#!/usr/bin/env node
/**
 * Credit the Aptos agent wallet with APT (for gas and, on devnet, programmatic faucet).
 * Reference: https://canteenapp-aptos-x402.notion.site/ (Canteen – Aptos x402 hydration).
 *
 * - Devnet: uses Aptos SDK fundAccount (public faucet API). Set APTOS_FAUCET_NETWORK=devnet.
 * - Testnet: no programmatic faucet; prints instructions and mint page URL (demo MCP uses testnet).
 *
 * Usage: node src/credit-aptos-agent.js [--amount OCTAS] [--open]
 *   OCTAS: 1 APT = 100_000_000 octas (default 100_000_000 = 1 APT).
 *   --open: open testnet mint page in browser (testnet only).
 * Env: APTOS_FAUCET_NETWORK=devnet | testnet (default testnet).
 */

import { APTOS_FAUCET_TESTNET_PAGE } from './lib/aptos/config.js';
import { exists,getWalletInfo } from './lib/aptos/wallet.js';

const DEFAULT_OCTAS = 100_000_000; // 1 APT

function parseArgs() {
  const args = process.argv.slice(2);
  let amount = DEFAULT_OCTAS;
  let openPage = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--amount' && args[i + 1] != null) {
      amount = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--open') {
      openPage = true;
    }
  }
  return { amount, openPage };
}

async function fundDevnet(address, amountOctas) {
  const { Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
  const aptosConfig = new AptosConfig({ network: Network.DEVNET });
  const aptos = new Aptos(aptosConfig);
  const res = await aptos.fundAccount({
    accountAddress: address,
    amount: amountOctas,
  });
  return res;
}

function printTestnetInstructions(address, openPage) {
  console.log('\nAptos testnet has no programmatic faucet. Fund the agent wallet manually:');
  console.log('  1. Open:', APTOS_FAUCET_TESTNET_PAGE);
  console.log('  2. Sign in (e.g. Google) and enter this address:', address);
  console.log('  3. Request APT (and fund USDC separately if needed for x402 payments).');
  console.log('\nDemo MCP uses testnet; for automated crediting use devnet (APTOS_FAUCET_NETWORK=devnet).');
  if (openPage) {
    try {
      const { execSync } = await import('child_process');
      const url = APTOS_FAUCET_TESTNET_PAGE;
      if (process.platform === 'win32') execSync(`start "" "${url}"`);
      else if (process.platform === 'darwin') execSync(`open "${url}"`);
      else execSync(`xdg-open "${url}"`);
      console.log('Opened mint page in browser.');
    } catch (e) {
      console.log('Could not open browser:', e.message);
    }
  }
}

async function main() {
  const { amount, openPage } = parseArgs();
  const network = (process.env.APTOS_FAUCET_NETWORK || 'testnet').toLowerCase();

  if (!exists()) {
    console.error('No Aptos wallet found. Run: node src/setup-aptos.js');
    process.exit(1);
  }

  const info = getWalletInfo();
  const address = info?.address;
  if (!address) {
    console.error('Could not read agent address from wallet.');
    process.exit(1);
  }

  if (network === 'devnet') {
    try {
      console.log(`Funding agent wallet on devnet: ${address} (${amount} octas = ${amount / 100_000_000} APT)`);
      const res = await fundDevnet(address, amount);
      console.log('Funded. Transaction:', res.hash);
      console.log('Note: Demo MCP typically uses testnet; devnet funding is for local/testing.');
    } catch (e) {
      console.error('Devnet faucet failed:', e.message);
      process.exit(1);
    }
    return;
  }

  // testnet (default)
  console.log('Agent Aptos address (testnet):', address);
  printTestnetInstructions(address, openPage);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
