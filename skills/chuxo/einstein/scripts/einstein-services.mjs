#!/usr/bin/env node

/**
 * Einstein x402 Skill — Service Discovery
 *
 * Fetches the live service catalog from Einstein's /x402/bitquery/supported endpoint.
 * This is a free endpoint (no payment required).
 *
 * Usage:
 *   node scripts/einstein-services.mjs [--json] [--category <category>]
 */

import { loadConfig } from './lib/x402-pay.mjs';

const SUPPORTED_ENDPOINT = '/x402/bitquery/supported';

// Fallback catalog if the live endpoint is unreachable
const FALLBACK_SERVICES = [
  { path: '/x402/bitquery/latest-pairs',       name: 'Latest Tokens',       raw: '0.25', tier: 'Basic',         chains: 'base, ethereum, bsc, arbitrum, polygon, optimism' },
  { path: '/x402/bitquery/tokenchart',          name: 'Token Chart',         raw: '0.25', tier: 'Basic',         chains: 'base, ethereum, bsc, arbitrum, polygon, optimism, zksync' },
  { path: '/x402/bitquery/ohlcv',               name: 'OHLCV',              raw: '0.40', tier: 'Standard',      chains: 'base, ethereum, bsc, arbitrum, polygon, optimism' },
  { path: '/x402/bitquery/top-tokens',          name: 'Top Tokens',         raw: '0.40', tier: 'Standard',      chains: 'base, ethereum, bsc, arbitrum, polygon, optimism, zksync' },
  { path: '/x402/bitquery/topvolume',           name: 'Top Movers',         raw: '0.40', tier: 'Standard',      chains: 'base, ethereum, bsc, arbitrum, polygon, optimism, zksync, solana' },
  { path: '/x402/bitquery/virtual-pools',       name: 'Virtuals Protocol',  raw: '0.40', tier: 'Standard',      chains: 'base' },
  { path: '/x402/bitquery/wallet-holdings',     name: 'Wallet Holdings',    raw: '0.40', tier: 'Standard',      chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/holderconcentration', name: 'Holder Concentration', raw: '0.40', tier: 'Standard',   chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/zora-launches',       name: 'Zora Launches',      raw: '0.60', tier: 'Platform',      chains: 'base' },
  { path: '/x402/bitquery/zora-volume',         name: 'Zora Volume',        raw: '0.60', tier: 'Platform',      chains: 'base' },
  { path: '/x402/bitquery/pumpfun-launches',    name: 'Pump.fun Launches',  raw: '0.60', tier: 'Platform',      chains: 'solana' },
  { path: '/x402/bitquery/pumpfun-volume',      name: 'Pump.fun Volume',    raw: '0.60', tier: 'Platform',      chains: 'solana' },
  { path: '/x402/bitquery/pumpfun-graduation',  name: 'Pump.fun Graduation', raw: '0.60', tier: 'Platform',    chains: 'solana' },
  { path: '/x402/bitquery/bscalpha',            name: 'BSC Alpha',          raw: '0.60', tier: 'Platform',      chains: 'bsc' },
  { path: '/x402/bitquery/liquidityshifts',     name: 'Liquidity Shifts',   raw: '0.60', tier: 'Platform',      chains: 'ethereum, base, bsc, arbitrum, polygon, optimism, zksync' },
  { path: '/x402/bitquery/whaleintel',          name: 'Whale Intel',        raw: '0.85', tier: 'Advanced',      chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/toptraders',          name: 'Top Traders',        raw: '0.85', tier: 'Advanced',      chains: 'bsc' },
  { path: '/x402/bitquery/dexcapital',          name: 'DEX Capital',        raw: '0.85', tier: 'Advanced',      chains: 'bsc, base, ethereum, arbitrum, polygon, optimism, zksync' },
  { path: '/x402/bitquery/smartmoney',          name: 'Smart Money',        raw: '0.85', tier: 'Advanced',      chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/tokensniping',        name: 'Token Sniping',      raw: '0.85', tier: 'Advanced',      chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/polymarket-events',   name: 'Polymarket Events',  raw: '0.85', tier: 'Advanced',      chains: 'polygon' },
  { path: '/x402/bitquery/polymarket-chain-compare', name: 'Polymarket Compare', raw: '1.00', tier: 'Comprehensive', chains: 'polygon' },
  { path: '/x402/bitquery/investment-report',   name: 'Investment Report',  raw: '1.00', tier: 'Comprehensive', chains: 'base, ethereum, bsc, solana, arbitrum, polygon, optimism, zksync' },
  { path: '/x402/bitquery/nftanalytics',        name: 'NFT Analytics',      raw: '1.00', tier: 'Comprehensive', chains: 'ethereum, base, bsc, arbitrum, polygon, optimism' },
  { path: '/x402/bitquery/mevdetection',        name: 'MEV Detection',      raw: '1.00', tier: 'Comprehensive', chains: 'ethereum, base, bsc, arbitrum, polygon' },
  { path: '/x402/bitquery/arbitragescanner',    name: 'Arbitrage Scanner',  raw: '1.00', tier: 'Comprehensive', chains: 'ethereum, base, bsc, arbitrum, polygon, optimism' },
  { path: '/x402/bitquery/rug-pull-scanner',    name: 'Rug Pull Scanner',   raw: '1.00', tier: 'Comprehensive', chains: 'ethereum, base, bsc, arbitrum, polygon' },
];

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

async function fetchLiveCatalog(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}${SUPPORTED_ENDPOINT}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to fallback
  }
  return null;
}

function formatTable(services) {
  const lines = [
    'Einstein x402 Blockchain Analytics Services',
    '============================================',
    '',
    `${services.length} services available — all paid via USDC on Base network`,
    '',
    'Service              | Raw    | +AI    | Tier           | Chains',
    '---------------------|--------|--------|----------------|-------',
  ];

  for (const svc of services) {
    const analyzed = (parseFloat(svc.raw) + 0.15).toFixed(2);
    const name = (svc.name || svc.path.split('/').pop()).padEnd(20);
    lines.push(
      `${name} | $${svc.raw.padStart(4)} | $${analyzed.padStart(4)} | ${(svc.tier || '').padEnd(14)} | ${svc.chains || ''}`
    );
  }

  lines.push('');
  lines.push('Raw = structured data only. +AI = includes AI-generated analysis (+$0.15).');
  lines.push('Default response includes AI analysis. Use --raw flag for data only.');
  lines.push('');
  lines.push('Payment: USDC on Base (EIP-3009 TransferWithAuthorization via x402 protocol)');
  lines.push('Provider: emc2ai.io | Facilitator: Coinbase CDP');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig();

  process.stderr.write('Fetching service catalog from Einstein...\n');

  const liveData = await fetchLiveCatalog(config.baseUrl);
  let services;

  if (liveData && Array.isArray(liveData.services || liveData)) {
    services = liveData.services || liveData;
    process.stderr.write(`Fetched ${services.length} services from ${config.baseUrl}\n`);
  } else {
    services = FALLBACK_SERVICES;
    process.stderr.write('Using cached service catalog (live endpoint unreachable)\n');
  }

  // Filter by category if specified
  if (args.category) {
    services = services.filter(
      (s) => (s.category || s.tier || '').toLowerCase().includes(args.category.toLowerCase())
    );
  }

  // Output
  if (args.json) {
    console.log(JSON.stringify(services, null, 2));
  } else {
    console.log(formatTable(services));
  }
}

main();
