#!/usr/bin/env node

/**
 * Einstein x402 Skill — First-Time Setup
 *
 * Guides through configuration:
 *   1. Check Node.js version (>=18 required)
 *   2. Check/install npm dependencies
 *   3. Configure private key
 *   4. Verify USDC balance on Base (optional)
 *   5. Write config.json
 *   6. Test connectivity to emc2ai.io
 *
 * Usage:
 *   node scripts/einstein-setup.mjs [--key <privateKey>] [--url <baseUrl>] [--chain <chain>]
 */

import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(__dirname, '..');
const CONFIG_PATH = join(SKILL_ROOT, 'config.json');

const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC = 'https://mainnet.base.org';
const SUPPORTED_ENDPOINT = '/x402/bitquery/supported';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 2;
      } else {
        args[key] = true;
        i += 1;
      }
    } else {
      i += 1;
    }
  }
  return args;
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkNodeVersion() {
  const version = process.versions.node;
  const major = parseInt(version.split('.')[0], 10);
  if (major < 18) {
    console.error(`Node.js ${version} detected. Version 18+ is required.`);
    console.error('Install: https://nodejs.org or use nvm: nvm install 18');
    return false;
  }
  console.error(`Node.js ${version} — OK`);
  return true;
}

async function checkDependencies() {
  try {
    await import('viem');
    console.error('Dependencies installed — OK');
    return true;
  } catch {
    console.error('Dependencies not installed. Installing...');
    const { execSync } = await import('node:child_process');
    try {
      execSync('npm install', { cwd: SKILL_ROOT, stdio: 'inherit' });
      console.error('Dependencies installed — OK');
      return true;
    } catch (err) {
      console.error(`Failed to install dependencies: ${err.message}`);
      console.error('Run manually: cd packages/project-einstein/openclaw-skill/einstein && npm install');
      return false;
    }
  }
}

async function getWalletAddress(privateKey) {
  // Derive address from private key using viem
  try {
    const { privateKeyToAccount } = await import('viem/accounts');
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(key);
    return account.address;
  } catch {
    return null;
  }
}

async function checkUsdcBalance(walletAddress) {
  try {
    // ERC-20 balanceOf(address) selector: 0x70a08231
    const data = `0x70a08231000000000000000000000000${walletAddress.slice(2).toLowerCase()}`;

    const res = await fetch(BASE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: USDC_BASE_ADDRESS, data }, 'latest'],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await res.json();
    if (result.result) {
      const balance = BigInt(result.result);
      const usdcBalance = Number(balance) / 1e6;
      return usdcBalance;
    }
  } catch {
    // Balance check is optional
  }
  return null;
}

async function testConnectivity(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}${SUPPORTED_ENDPOINT}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  console.error('');
  console.error('Einstein x402 Skill — Setup');
  console.error('===========================');
  console.error('');

  // Step 1: Check Node.js
  console.error('1. Checking Node.js version...');
  if (!checkNodeVersion()) {
    process.exit(1);
  }
  console.error('');

  // Step 2: Check dependencies
  console.error('2. Checking dependencies...');
  const depsOk = await checkDependencies();
  if (!depsOk) {
    process.exit(1);
  }
  console.error('');

  // Step 3: Private key
  console.error('3. Configuring wallet...');
  let privateKey = args.key || process.env.EINSTEIN_X402_PRIVATE_KEY;

  // Check existing config
  if (!privateKey && existsSync(CONFIG_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      if (existing.privateKey) {
        console.error('   Found existing config.json with private key.');
        const reuse = await prompt('   Use existing key? (Y/n): ');
        if (reuse.toLowerCase() !== 'n') {
          privateKey = existing.privateKey;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  if (!privateKey) {
    console.error('');
    console.error('   A private key is needed to sign x402 USDC payments on Base.');
    console.error('   This key controls the wallet that pays for analytics queries.');
    console.error('   Recommended: Use a dedicated wallet with small USDC balance.');
    console.error('');
    privateKey = await prompt('   Enter private key (0x...): ');
  }

  if (!privateKey) {
    console.error('   No private key provided. You can set EINSTEIN_X402_PRIVATE_KEY later.');
    process.exit(1);
  }

  // Ensure 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`;
  }

  // Validate key format (basic check)
  if (privateKey.length !== 66) {
    console.error(`   Warning: Key length ${privateKey.length} (expected 66). Proceeding anyway.`);
  }

  console.error('   Private key configured.');
  console.error('');

  // Step 4: Check USDC balance
  console.error('4. Checking USDC balance on Base...');
  const walletAddress = await getWalletAddress(privateKey);
  if (walletAddress) {
    console.error(`   Wallet: ${walletAddress}`);
    const balance = await checkUsdcBalance(walletAddress);
    if (balance !== null) {
      console.error(`   USDC Balance: $${balance.toFixed(2)}`);
      if (balance < 1) {
        console.error('   Warning: Low USDC balance. Fund via https://bridge.base.org');
      }
    } else {
      console.error('   Could not check balance (RPC unreachable — not critical).');
    }
  } else {
    console.error('   Could not derive wallet address (viem not loaded yet).');
  }
  console.error('');

  // Step 5: Write config
  console.error('5. Writing config.json...');
  const baseUrl = args.url || process.env.EINSTEIN_BASE_URL || 'https://emc2ai.io';
  const defaultChain = args.chain || process.env.EINSTEIN_DEFAULT_CHAIN || 'base';

  const config = {
    privateKey,
    baseUrl,
    defaultChain,
  };

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.error(`   Written to: ${CONFIG_PATH}`);
  console.error('   IMPORTANT: Add config.json to .gitignore — it contains your private key!');
  console.error('');

  // Step 6: Test connectivity
  console.error('6. Testing connectivity to Einstein...');
  const connected = await testConnectivity(baseUrl);
  if (connected) {
    console.error(`   Connected to ${baseUrl} — OK`);
  } else {
    console.error(`   Could not reach ${baseUrl}${SUPPORTED_ENDPOINT}`);
    console.error('   The service may be temporarily down. Queries will retry automatically.');
  }
  console.error('');

  // Done
  console.error('Setup complete!');
  console.error('');
  console.error('Quick test:');
  console.error('  node scripts/einstein.mjs services');
  console.error('');
  console.error('First query (costs ~$0.55 USDC):');
  console.error('  node scripts/einstein.mjs top-movers --chain base --limit 5');
  console.error('');
}

main();
