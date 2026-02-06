#!/usr/bin/env node
/**
 * Mamo CLI — DeFi yield aggregator on Base (Moonwell)
 * Usage: node mamo.mjs <command> [args]
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, encodeFunctionData, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SiweMessage } from 'siwe';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// Load .env from script directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const API_ACCOUNT = 'https://mamo-queues.moonwell.workers.dev';
const API_INDEXER = 'https://mamo-indexer.moonwell.workers.dev';
const CHAIN_ID = 8453;

const REGISTRY_ADDRESS = '0x46a5624C2ba92c08aBA4B206297052EDf14baa92';

const TOKENS = {
  usdc: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
  cbbtc: { address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8, symbol: 'cbBTC' },
  mamo: { address: '0x7300b37dfdfab110d83290a29dfb31b1740219fe', decimals: 18, symbol: 'MAMO' },
  eth: { address: null, decimals: 18, symbol: 'ETH' },
};

const STRATEGIES = {
  usdc_stablecoin: { token: 'usdc', label: 'USDC Stablecoin', factory: '0x5967ea71cC65d610dc6999d7dF62bfa512e62D07' },
  cbbtc_lending: { token: 'cbbtc', label: 'cbBTC Lending', factory: '0xE23c8E37F256Ba5783351CBb7B6673FE68248712' },
  mamo_staking: { token: 'mamo', label: 'MAMO Staking', factory: null }, // Uses MamoStakingStrategyFactory
  eth_lending: { token: 'eth', label: 'ETH Lending', factory: '0x14bA47Ef0286B345E2B74d26243767268290eE28' },
};

const FACTORY_ABI = [
  { name: 'createStrategyForUser', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'address' }] },
  { name: 'strategyTypeId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

// Minimal ABIs
const ERC20_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

const STRATEGY_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdrawAll', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'token', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'strategyTypeId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

const REGISTRY_ABI = [
  { name: 'getUserStrategies', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'address[]' }] },
  { name: 'isUserStrategy', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'strategy', type: 'address' }], outputs: [{ type: 'bool' }] },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg = '') { console.log(msg); }
function info(msg) { console.log(`${C.cyan}ℹ${C.reset} ${msg}`); }
function ok(msg) { console.log(`${C.green}✅${C.reset} ${msg}`); }
function warn(msg) { console.log(`${C.yellow}⚠️${C.reset} ${msg}`); }
function fail(msg) { console.error(`${C.red}❌${C.reset} ${msg}`); process.exit(1); }
function header(msg) { log(`\n${C.bold}${C.magenta}🐮 ${msg}${C.reset}`); log('━'.repeat(50)); }

function getConfigDir() {
  const dir = join(homedir(), '.config', 'mamo');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getTokenPath() { return join(getConfigDir(), 'auth.json'); }
function getStrategiesPath() { return join(getConfigDir(), 'strategies.json'); }

function saveLocalStrategies(data) {
  writeFileSync(getStrategiesPath(), JSON.stringify(data, null, 2));
}

function loadLocalStrategies() {
  const p = getStrategiesPath();
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return {}; }
}

function addLocalStrategy(walletAddress, strategyType, strategyAddress, txHash) {
  const data = loadLocalStrategies();
  const key = walletAddress.toLowerCase();
  if (!data[key]) data[key] = {};
  data[key][strategyType] = { address: strategyAddress, txHash, createdAt: new Date().toISOString() };
  saveLocalStrategies(data);
}

// Get all strategy addresses for a wallet — merges on-chain registry + local storage
async function getAllStrategies(publicClient, walletAddress) {
  const results = [];

  // 1. Check on-chain registry
  try {
    const onChain = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'getUserStrategies',
      args: [walletAddress],
    });
    for (const addr of onChain) results.push(addr);
  } catch { /* registry may be inaccessible */ }

  // 2. Merge local strategies
  const local = loadLocalStrategies();
  const localEntries = local[walletAddress.toLowerCase()] || {};
  for (const entry of Object.values(localEntries)) {
    if (entry.address && !results.some(a => a.toLowerCase() === entry.address.toLowerCase())) {
      results.push(entry.address);
    }
  }

  return results;
}

function saveToken(data) {
  writeFileSync(getTokenPath(), JSON.stringify(data, null, 2));
}

function loadToken() {
  const p = getTokenPath();
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

function getPrivateKey() {
  const key = process.env.MAMO_WALLET_KEY;
  if (!key) fail('MAMO_WALLET_KEY environment variable not set');
  return key.startsWith('0x') ? key : `0x${key}`;
}

function getRpcUrl() {
  return process.env.MAMO_RPC_URL || 'https://mainnet.base.org';
}

function getClients() {
  const account = privateKeyToAccount(getPrivateKey());
  const transport = http(getRpcUrl());
  const publicClient = createPublicClient({ chain: base, transport });
  const walletClient = createWalletClient({ chain: base, transport, account });
  return { publicClient, walletClient, account };
}

async function waitForTx(publicClient, hash) {
  info(`Tx: ${hash}`);
  info('Waiting for confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  if (receipt.status !== 'success') fail(`Transaction reverted: ${hash}`);
  return receipt;
}

function resolveToken(tokenArg) {
  const key = tokenArg.toLowerCase();
  if (TOKENS[key]) return { key, ...TOKENS[key] };
  // Try matching by symbol
  for (const [k, v] of Object.entries(TOKENS)) {
    if (v.symbol.toLowerCase() === key) return { key: k, ...v };
  }
  fail(`Unknown token: ${tokenArg}. Available: ${Object.values(TOKENS).map(t => t.symbol).join(', ')}`);
}

// ═══════════════════════════════════════════════════════════════
// Commands
// ═══════════════════════════════════════════════════════════════

async function cmdAuth() {
  header('SIWE Authentication');
  
  const { account } = getClients();
  const address = account.address;
  info(`Wallet: ${address}`);
  
  // Create SIWE message
  const now = new Date();
  const siweMessage = new SiweMessage({
    domain: 'mamo.xyz',
    address: address,
    statement: 'Sign in to Mamo',
    uri: 'https://mamo.xyz',
    version: '1',
    chainId: CHAIN_ID,
    nonce: Math.random().toString(36).substring(2, 15),
    issuedAt: now.toISOString(),
    expirationTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  });
  
  const message = siweMessage.prepareMessage();
  info('Signing SIWE message...');
  
  // Sign with viem wallet
  const walletClient = createWalletClient({
    chain: base,
    transport: http(getRpcUrl()),
    account,
  });
  
  const signature = await walletClient.signMessage({ message });
  
  // POST to Mamo API for auth
  info('Authenticating with Mamo API...');
  
  try {
    const res = await fetch(`${API_ACCOUNT}/onboard-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        signature,
        account: address,
      }),
    });
    
    if (!res.ok) {
      const body = await res.text();
      warn(`API returned ${res.status}: ${body}`);
      // Even if the API auth flow isn't fully understood, save what we have
      // The SIWE signature itself serves as proof of wallet ownership
    }
    
    const data = res.ok ? await res.json() : null;
    
    // Save auth data
    const authData = {
      address,
      signature,
      message,
      timestamp: now.toISOString(),
      apiResponse: data,
    };
    saveToken(authData);
    
    ok('Authentication successful');
    log(`${C.dim}Saved to ${getTokenPath()}${C.reset}`);
    
    if (data) {
      log(`\n${C.bold}API Response:${C.reset}`);
      log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    warn(`API call failed: ${err.message}`);
    // Save signature anyway for potential offline use
    saveToken({
      address,
      signature,
      message,
      timestamp: now.toISOString(),
      error: err.message,
    });
    warn('Saved SIWE signature locally. API endpoint may need different auth flow.');
  }
}

async function cmdCreate(strategyType) {
  if (!strategyType) fail('Usage: mamo create <strategy>\nStrategies: ' + Object.keys(STRATEGIES).join(', '));
  if (!STRATEGIES[strategyType]) fail(`Unknown strategy: ${strategyType}\nAvailable: ${Object.keys(STRATEGIES).join(', ')}`);
  
  const strat = STRATEGIES[strategyType];
  if (!strat.factory) fail(`Strategy "${strategyType}" does not have a factory contract configured yet.`);

  header(`Create Strategy: ${strat.label}`);
  
  const { publicClient, walletClient, account } = getClients();
  const address = account.address;
  info(`Wallet: ${address}`);
  info(`Factory: ${strat.factory}`);

  // Check if user already has this strategy type (local or on-chain)
  const existing = await getAllStrategies(publicClient, address);
  const token = TOKENS[strat.token];
  for (const addr of existing) {
    try {
      const stratToken = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });
      if (token.address && stratToken.toLowerCase() === token.address.toLowerCase()) {
        warn(`You already have a ${strat.label} strategy at ${addr}`);
        warn('Skipping creation. Use "mamo deposit" to add funds.');
        return;
      }
    } catch { /* skip */ }
  }

  // Check ETH for gas
  const ethBal = await publicClient.getBalance({ address });
  if (ethBal < BigInt(1e14)) {
    fail(`Insufficient ETH for gas (${formatUnits(ethBal, 18)} ETH). Need at least 0.0001 ETH on Base.`);
  }

  info('Simulating createStrategyForUser...');
  
  try {
    const { result, request } = await publicClient.simulateContract({
      address: strat.factory,
      abi: FACTORY_ABI,
      functionName: 'createStrategyForUser',
      args: [address],
      account,
    });

    info(`Strategy will deploy at: ${result}`);
    info('Sending transaction...');

    const hash = await walletClient.writeContract(request);
    const receipt = await waitForTx(publicClient, hash);

    // Save locally (registry may not be updated due to access control)
    addLocalStrategy(address, strategyType, result, hash);

    log(`\n${C.bold}${C.green}🎉 Strategy Created!${C.reset}`);
    log('━'.repeat(50));
    log(`Type:      ${strat.label}`);
    log(`Address:   ${result}`);
    log(`Owner:     ${address}`);
    log(`Gas used:  ${receipt.gasUsed.toString()}`);
    log(`BaseScan:  https://basescan.org/tx/${hash}`);
    log('━'.repeat(50));
    log(`${C.dim}Strategy saved to ${getStrategiesPath()}${C.reset}`);
  } catch (err) {
    fail(`Failed to create strategy: ${err.message}`);
  }
}

async function cmdDeposit(amountStr, tokenArg) {
  if (!amountStr || !tokenArg) fail('Usage: mamo deposit <amount> <token>\nExample: mamo deposit 100 usdc');
  
  const token = resolveToken(tokenArg);
  const amount = parseUnits(amountStr, token.decimals);
  
  if (amount <= 0n) fail('Amount must be greater than 0');
  
  header(`Deposit ${amountStr} ${token.symbol}`);
  
  const { publicClient, walletClient, account } = getClients();
  const address = account.address;
  info(`Wallet: ${address}`);
  
  // Find user's strategy for this token (on-chain registry + local)
  const strategies = await getAllStrategies(publicClient, address);
  
  if (strategies.length === 0) {
    fail('No strategies found. Run "mamo create <strategy>" first.');
  }
  
  // Find the strategy that matches this token
  let strategyAddress = null;
  for (const addr of strategies) {
    try {
      const stratToken = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });
      if (stratToken.toLowerCase() === token.address?.toLowerCase()) {
        strategyAddress = addr;
        break;
      }
    } catch { /* skip non-matching strategies */ }
  }
  
  if (!strategyAddress) {
    fail(`No strategy found for ${token.symbol}. Run "mamo create <strategy_type>" first.\nYour strategies: ${strategies.join(', ')}`);
  }
  
  info(`Strategy contract: ${strategyAddress}`);
  
  // Check token balance
  const balance = await publicClient.readContract({
    address: token.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
  
  if (balance < amount) {
    fail(`Insufficient ${token.symbol} balance\n   Available: ${formatUnits(balance, token.decimals)} ${token.symbol}\n   Required:  ${amountStr} ${token.symbol}`);
  }
  
  // Check ETH for gas
  const ethBal = await publicClient.getBalance({ address });
  if (ethBal < BigInt(1e14)) {
    fail(`Insufficient ETH for gas (${formatUnits(ethBal, 18)} ETH). Need at least 0.0001 ETH.`);
  }
  
  log(`\n${C.bold}📋 Transaction Preview${C.reset}`);
  log('━'.repeat(40));
  log(`Depositing:      ${amountStr} ${token.symbol}`);
  log(`Strategy:        ${strategyAddress}`);
  log(`${token.symbol} balance:   ${formatUnits(balance, token.decimals)}`);
  log(`After deposit:   ${formatUnits(balance - amount, token.decimals)} ${token.symbol}`);
  log('━'.repeat(40));
  
  // Step 1: Check allowance and approve if needed
  const allowance = await publicClient.readContract({
    address: token.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, strategyAddress],
  });
  
  if (allowance < amount) {
    log(`\n${C.bold}📝 Step 1/2: Approving ${token.symbol}...${C.reset}`);
    const { request: approveReq } = await publicClient.simulateContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [strategyAddress, amount],
      account,
    });
    const approveTx = await walletClient.writeContract(approveReq);
    await waitForTx(publicClient, approveTx);
    ok('Approved');
  } else {
    log(`\n${C.bold}📝 Step 1/2:${C.reset} Already approved ✅`);
  }
  
  // Step 2: Deposit
  log(`\n${C.bold}📝 Step 2/2: Depositing into strategy...${C.reset}`);
  const { request: depositReq } = await publicClient.simulateContract({
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'deposit',
    args: [amount],
    account,
  });
  const depositTx = await walletClient.writeContract(depositReq);
  const receipt = await waitForTx(publicClient, depositTx);
  
  log(`\n${C.bold}${C.green}🎉 Deposit Complete!${C.reset}`);
  log('━'.repeat(40));
  log(`Amount:    ${amountStr} ${token.symbol}`);
  log(`BaseScan:  https://basescan.org/tx/${depositTx}`);
  log('━'.repeat(40));
}

async function cmdWithdraw(amountStr, tokenArg) {
  if (!tokenArg) fail('Usage: mamo withdraw <amount|all> <token>\nExample: mamo withdraw 50 usdc');
  
  const token = resolveToken(tokenArg);
  const withdrawAll = amountStr.toLowerCase() === 'all';
  
  header(`Withdraw ${withdrawAll ? 'ALL' : amountStr} ${token.symbol}`);
  
  const { publicClient, walletClient, account } = getClients();
  const address = account.address;
  info(`Wallet: ${address}`);
  
  // Find user's strategy for this token (on-chain registry + local)
  const strategies = await getAllStrategies(publicClient, address);
  
  if (strategies.length === 0) fail('No strategies found.');
  
  let strategyAddress = null;
  for (const addr of strategies) {
    try {
      const stratToken = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });
      if (stratToken.toLowerCase() === token.address?.toLowerCase()) {
        strategyAddress = addr;
        break;
      }
    } catch { /* skip */ }
  }
  
  if (!strategyAddress) fail(`No strategy found for ${token.symbol}.`);
  
  info(`Strategy contract: ${strategyAddress}`);
  
  // Verify ownership
  const owner = await publicClient.readContract({
    address: strategyAddress,
    abi: STRATEGY_ABI,
    functionName: 'owner',
  });
  if (owner.toLowerCase() !== address.toLowerCase()) {
    fail(`You are not the owner of this strategy. Owner: ${owner}`);
  }
  
  if (withdrawAll) {
    log(`\n${C.bold}📝 Withdrawing all ${token.symbol}...${C.reset}`);
    const { request } = await publicClient.simulateContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'withdrawAll',
      args: [],
      account,
    });
    const tx = await walletClient.writeContract(request);
    await waitForTx(publicClient, tx);
    
    ok(`Withdrew all ${token.symbol}`);
    log(`BaseScan: https://basescan.org/tx/${tx}`);
  } else {
    const amount = parseUnits(amountStr, token.decimals);
    if (amount <= 0n) fail('Amount must be greater than 0');
    
    log(`\n${C.bold}📝 Withdrawing ${amountStr} ${token.symbol}...${C.reset}`);
    const { request } = await publicClient.simulateContract({
      address: strategyAddress,
      abi: STRATEGY_ABI,
      functionName: 'withdraw',
      args: [amount],
      account,
    });
    const tx = await walletClient.writeContract(request);
    await waitForTx(publicClient, tx);
    
    ok(`Withdrew ${amountStr} ${token.symbol}`);
    log(`BaseScan: https://basescan.org/tx/${tx}`);
  }
}

async function cmdStatus() {
  header('Account Status');
  
  const { publicClient, account } = getClients();
  const address = account.address;
  info(`Wallet: ${address}`);
  
  // Check ETH balance
  const ethBal = await publicClient.getBalance({ address });
  log(`\n${C.bold}💰 Wallet Balances${C.reset}`);
  log(`   ETH:   ${formatUnits(ethBal, 18)}`);
  
  // Check token balances
  for (const [key, token] of Object.entries(TOKENS)) {
    if (!token.address) continue;
    try {
      const bal = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      log(`   ${token.symbol.padEnd(6)} ${formatUnits(bal, token.decimals)}`);
    } catch { /* skip */ }
  }
  
  // Get strategies from registry + local storage
  log(`\n${C.bold}📊 Mamo Strategies${C.reset}`);
  
  const strategies = await getAllStrategies(publicClient, address);
  
  if (strategies.length === 0) {
    log(`   ${C.dim}No strategies found. Run "mamo create <strategy>" to get started.${C.reset}`);
    return;
  }
  
  for (const addr of strategies) {
    try {
      const tokenAddr = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'token',
      });
      
      // Get token info
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'symbol' }),
        publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'decimals' }),
      ]);
      
      // Get token balance in the strategy
      const stratBal = await publicClient.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [addr],
      });
      
      const typeId = await publicClient.readContract({
        address: addr,
        abi: STRATEGY_ABI,
        functionName: 'strategyTypeId',
      });
      
      log(`\n   ${C.cyan}Strategy: ${addr}${C.reset}`);
      log(`   Token:      ${symbol} (${tokenAddr})`);
      log(`   Type ID:    ${typeId}`);
      log(`   Idle bal:   ${formatUnits(stratBal, Number(decimals))} ${symbol}`);
    } catch (err) {
      log(`\n   ${C.yellow}Strategy: ${addr}${C.reset}`);
      log(`   ${C.dim}(could not read details: ${err.message})${C.reset}`);
    }
  }
  
  // Also try the Mamo API for richer data
  try {
    const res = await fetch(`${API_INDEXER}/account/${address}`);
    if (res.ok) {
      const data = await res.json();
      log(`\n${C.bold}📡 API Account Data${C.reset}`);
      log(JSON.stringify(data, null, 2));
    }
  } catch { /* API not available, that's ok */ }
}

async function cmdApy(strategyType) {
  header('Current APY Rates');
  
  const types = strategyType ? [strategyType] : Object.keys(STRATEGIES);
  
  for (const st of types) {
    if (!STRATEGIES[st]) {
      warn(`Unknown strategy: ${st}`);
      continue;
    }
    
    try {
      const res = await fetch(`${API_INDEXER}/apy/${st}`);
      if (!res.ok) {
        const text = await res.text();
        log(`   ${C.yellow}${STRATEGIES[st].label}:${C.reset} ${C.dim}(API error ${res.status}: ${text.slice(0, 100)})${C.reset}`);
        continue;
      }
      const data = await res.json();
      
      log(`\n   ${C.bold}${STRATEGIES[st].label}${C.reset}`);
      if (typeof data === 'object' && data !== null) {
        if (data.totalApy !== undefined) {
          const fmt = (v) => v.toFixed(2);
          log(`   Total APY:   ${C.green}${C.bold}${fmt(data.totalApy)}%${C.reset}`);
          if (data.baseApy !== undefined) log(`   Base APY:    ${fmt(data.baseApy)}%`);
          if (data.rewardsApy !== undefined) log(`   Rewards APY: ${fmt(data.rewardsApy)}%`);
          if (Array.isArray(data.rewards)) {
            for (const r of data.rewards) {
              if (r.symbol && r.apr !== undefined) {
                log(`   ${C.dim}└ ${r.symbol}: ${fmt(r.apr)}%${C.reset}`);
              }
            }
          }
        } else {
          log(`   ${JSON.stringify(data, null, 2)}`);
        }
      } else {
        log(`   APY: ${C.green}${data}${C.reset}`);
      }
    } catch (err) {
      log(`   ${C.yellow}${STRATEGIES[st].label}:${C.reset} ${C.dim}(${err.message})${C.reset}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

const USAGE = `
${C.bold}${C.magenta}🐮 Mamo CLI${C.reset} — DeFi Yield Aggregator (Moonwell on Base)

${C.bold}Usage:${C.reset}
  node mamo.mjs <command> [args]

${C.bold}Commands:${C.reset}
  ${C.cyan}create${C.reset} <strategy>            Create a yield strategy (on-chain via factory)
  ${C.cyan}deposit${C.reset} <amount> <token>     Deposit tokens into strategy
  ${C.cyan}withdraw${C.reset} <amount|all> <token>  Withdraw tokens from strategy
  ${C.cyan}status${C.reset}                       Account overview & balances
  ${C.cyan}apy${C.reset} [strategy]               Current APY rates

${C.bold}Strategies:${C.reset}
  usdc_stablecoin    USDC lending/yield
  cbbtc_lending      cbBTC lending
  mamo_staking       MAMO token staking
  eth_lending        ETH lending

${C.bold}Tokens:${C.reset}
  usdc, cbbtc, mamo, eth

${C.bold}Environment:${C.reset}
  MAMO_WALLET_KEY    Private key (required for on-chain ops)
  MAMO_RPC_URL       Base RPC URL (default: https://mainnet.base.org)

${C.bold}Examples:${C.reset}
  node mamo.mjs create usdc_stablecoin
  node mamo.mjs deposit 100 usdc
  node mamo.mjs withdraw 50 usdc
  node mamo.mjs withdraw all cbbtc
  node mamo.mjs status
  node mamo.mjs apy usdc_stablecoin
`;

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  if (!cmd || cmd === '--help' || cmd === '-h') {
    log(USAGE);
    process.exit(0);
  }
  
  try {
    switch (cmd) {
      case 'auth':
        warn('Auth is not needed — strategies are created directly on-chain via factory contracts.');
        warn('Use "mamo create <strategy>" to deploy a strategy.');
        break;
      case 'create':
        await cmdCreate(args[0]);
        break;
      case 'deposit':
        await cmdDeposit(args[0], args[1]);
        break;
      case 'withdraw':
        await cmdWithdraw(args[0], args[1]);
        break;
      case 'status':
        await cmdStatus();
        break;
      case 'apy':
        await cmdApy(args[0]);
        break;
      default:
        fail(`Unknown command: ${cmd}\nRun with --help for usage.`);
    }
  } catch (err) {
    if (err.message?.includes('process.exit')) throw err;
    fail(`${err.message}\n${C.dim}${err.stack}${C.reset}`);
  }
}

main();
