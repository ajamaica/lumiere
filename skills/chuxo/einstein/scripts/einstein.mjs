#!/usr/bin/env node

/**
 * Einstein x402 Skill — Main Entry Point
 *
 * Routes commands to Einstein's x402-protected Bitquery analytics endpoints.
 * Handles payment transparently via the x402 protocol.
 *
 * Usage:
 *   node scripts/einstein.mjs <service> [options]
 *
 * Options:
 *   --chain <chain>         Blockchain network (base, ethereum, bsc, solana, etc.)
 *   --limit <N>             Number of results (1-500, default: 10)
 *   --timeperiod <period>   Time window (1d, 3d, 7d, 30d — max 30d)
 *   --token <address>       Token contract address
 *   --wallet <address>      Wallet address
 *   --chains <c1,c2>        Comma-separated chains (investment-report only)
 *   --raw                   Get data-only response (cheaper, no AI analysis)
 *
 * Examples:
 *   node scripts/einstein.mjs top-movers --chain base --limit 10
 *   node scripts/einstein.mjs rug-scan --chain ethereum --token 0x1234...
 *   node scripts/einstein.mjs services
 */

import { x402Fetch, loadConfig } from './lib/x402-pay.mjs';

// ---------------------------------------------------------------------------
// Service routing map — maps command aliases to endpoint paths
// ---------------------------------------------------------------------------

const SERVICES = {
  // Tier 1: Basic ($0.25 raw, $0.40 analyzed)
  'latest-tokens':  { path: '/x402/bitquery/latest-pairs',       params: ['chain', 'limit'] },
  'chart':          { path: '/x402/bitquery/tokenchart',          params: ['chain', 'tokenAddress', 'timeperiod'] },

  // Tier 2: Standard ($0.40 raw, $0.55 analyzed)
  'ohlcv':          { path: '/x402/bitquery/ohlcv',               params: ['chain', 'tokenAddress', 'timeperiod'] },
  'top-tokens':     { path: '/x402/bitquery/top-tokens',          params: ['chain', 'limit'] },
  'top-movers':     { path: '/x402/bitquery/topvolume',           params: ['chain', 'limit', 'timeperiod'] },
  'virtuals':       { path: '/x402/bitquery/virtual-pools',       params: ['limit', 'timeperiod'] },
  'wallet':         { path: '/x402/bitquery/wallet-holdings',     params: ['chain', 'walletAddress'] },
  'holders':        { path: '/x402/bitquery/holderconcentration', params: ['chain', 'tokenAddress', 'limit'] },

  // Tier 3: Platform ($0.60 raw, $0.75 analyzed)
  'zora-launches':  { path: '/x402/bitquery/zora-launches',       params: ['limit', 'timeperiod'] },
  'zora-volume':    { path: '/x402/bitquery/zora-volume',         params: ['limit', 'timeperiod'] },
  'pump-launches':  { path: '/x402/bitquery/pumpfun-launches',    params: ['limit', 'timeperiod'] },
  'pump-volume':    { path: '/x402/bitquery/pumpfun-volume',      params: ['limit', 'timeperiod'] },
  'pump-grads':     { path: '/x402/bitquery/pumpfun-graduation',  params: ['limit'] },
  'alpha':          { path: '/x402/bitquery/bscalpha',            params: ['chain', 'limit', 'timeperiod'] },
  'liquidity':      { path: '/x402/bitquery/liquidityshifts',     params: ['chain', 'limit', 'timeperiod'] },

  // Tier 4: Advanced ($0.85 raw, $1.00 analyzed)
  'whale-intel':    { path: '/x402/bitquery/whaleintel',          params: ['chain', 'limit', 'timeperiod'] },
  'top-traders':    { path: '/x402/bitquery/toptraders',          params: ['chain', 'limit', 'timeperiod'] },
  'dex-capital':    { path: '/x402/bitquery/dexcapital',          params: ['chain', 'limit', 'timeperiod'] },
  'smart-money':    { path: '/x402/bitquery/smartmoney',          params: ['chain', 'limit', 'timeperiod'] },
  'token-snipe':    { path: '/x402/bitquery/tokensniping',        params: ['chain', 'tokenAddress', 'limit'] },
  'polymarket':     { path: '/x402/bitquery/polymarket-events',   params: ['limit', 'timeperiod'] },

  // Tier 5: Comprehensive ($1.00 raw, $1.15 analyzed)
  'polymarket-compare': { path: '/x402/bitquery/polymarket-chain-compare', params: ['limit'] },
  'investment-report':  { path: '/x402/bitquery/investment-report',    params: ['chains', 'limit', 'timeperiod'] },
  'nft-analytics':  { path: '/x402/bitquery/nftanalytics',        params: ['chain', 'limit', 'timeperiod'] },
  'mev-detect':     { path: '/x402/bitquery/mevdetection',        params: ['chain', 'limit', 'timeperiod'] },
  'arbitrage':      { path: '/x402/bitquery/arbitragescanner',    params: ['chain', 'limit', 'timeperiod'] },
  'rug-scan':       { path: '/x402/bitquery/rug-pull-scanner',    params: ['chain', 'tokenAddress'] },
};

// Pricing table (raw base prices — analyzed = raw + $0.15)
const PRICING = {
  'latest-tokens': '0.25', 'chart': '0.25',
  'ohlcv': '0.40', 'top-tokens': '0.40', 'top-movers': '0.40', 'virtuals': '0.40',
  'wallet': '0.40', 'holders': '0.40',
  'zora-launches': '0.60', 'zora-volume': '0.60', 'pump-launches': '0.60',
  'pump-volume': '0.60', 'pump-grads': '0.60', 'alpha': '0.60', 'liquidity': '0.60',
  'whale-intel': '0.85', 'top-traders': '0.85', 'dex-capital': '0.85',
  'smart-money': '0.85', 'token-snipe': '0.85', 'polymarket': '0.85',
  'polymarket-compare': '1.00', 'investment-report': '1.00', 'nft-analytics': '1.00',
  'mev-detect': '1.00', 'arbitrage': '1.00', 'rug-scan': '1.00',
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  let i = 2; // skip node and script path
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
      args._.push(arg);
      i += 1;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Service listing (free, no payment)
// ---------------------------------------------------------------------------

function listServices() {
  const lines = [
    'Einstein x402 Analytics Services',
    '================================',
    '',
    'Command              | Endpoint                              | Raw    | Analyzed | Tier',
    '---------------------|---------------------------------------|--------|----------|-----',
  ];

  const tierNames = {
    '0.25': 'Basic', '0.40': 'Standard', '0.60': 'Platform',
    '0.85': 'Advanced', '1.00': 'Comprehensive',
  };

  for (const [cmd, svc] of Object.entries(SERVICES)) {
    const rawPrice = PRICING[cmd] || '?';
    const analyzedPrice = (parseFloat(rawPrice) + 0.15).toFixed(2);
    const tier = tierNames[rawPrice] || '?';
    lines.push(
      `${cmd.padEnd(20)} | ${svc.path.padEnd(37)} | $${rawPrice.padStart(4)} | $${analyzedPrice.padStart(4)}   | ${tier}`
    );
  }

  lines.push('');
  lines.push('Use --raw for data-only (cheaper). Default includes AI analysis.');
  lines.push('All prices in USDC on Base network.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Build request body from args and service definition
// ---------------------------------------------------------------------------

function buildRequestBody(serviceDef, args, config) {
  const body = {};

  for (const param of serviceDef.params) {
    switch (param) {
      case 'chain':
        body.chain = args.chain || config.defaultChain;
        break;
      case 'chains':
        body.chains = args.chains
          ? args.chains.split(',').map((c) => c.trim())
          : [config.defaultChain];
        break;
      case 'limit':
        body.limit = Math.min(Math.max(parseInt(args.limit || '10', 10), 1), 500);
        break;
      case 'timeperiod':
        body.timeperiod = args.timeperiod || args.period || '7d';
        break;
      case 'tokenAddress':
        body.tokenAddress = args.token || args.tokenAddress;
        if (!body.tokenAddress) {
          process.stderr.write('Error: --token <address> is required for this service\n');
          process.exit(1);
        }
        break;
      case 'walletAddress':
        body.walletAddress = args.wallet || args.walletAddress;
        if (!body.walletAddress) {
          process.stderr.write('Error: --wallet <address> is required for this service\n');
          process.exit(1);
        }
        break;
    }
  }

  return body;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const command = args._[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stderr.write(`
Einstein x402 Analytics — OpenClaw Skill

Usage: node scripts/einstein.mjs <service> [options]

Services:
  services              List all available services (free)
  top-movers            Top gainers/losers by volume
  latest-tokens         Latest deployed tokens
  whale-intel           Whale accumulation tracking
  smart-money           Smart money leaderboard
  rug-scan              Token security scan
  token-snipe           Early buyer/sniper analysis
  pump-launches         Pump.fun new launches
  pump-grads            Pump.fun near-graduation
  zora-launches         Zora Launchpad tokens
  virtuals              Virtuals Protocol tokens
  investment-report     Multi-chain investment report
  mev-detect            MEV/sandwich detection
  arbitrage             Cross-chain arbitrage scanner
  nft-analytics         NFT collection analytics
  holders               Token holder concentration
  wallet                Wallet portfolio holdings
  ohlcv                 OHLCV candlestick data
  chart                 Token price chart
  top-tokens            Top tokens by market cap
  liquidity             DEX liquidity shifts
  dex-capital           Capital-intensive DEX traders
  top-traders           Top meme traders (BSC)
  alpha                 BSC alpha signals
  polymarket            Polymarket contract events
  polymarket-compare    Polymarket API vs chain compare

Options:
  --chain <chain>       Network: base, ethereum, bsc, solana, arbitrum, polygon, optimism, zksync
  --limit <N>           Results count (1-500, default: 10)
  --timeperiod <period> Time window: 1d, 3d, 7d, 30d (default: 7d)
  --token <address>     Token contract address
  --wallet <address>    Wallet address
  --chains <c1,c2>      Comma-separated chains (investment-report)
  --raw                 Data-only response (no AI analysis, cheaper)
`);
    process.exit(0);
  }

  // Handle "services" command (free, no payment)
  if (command === 'services') {
    console.log(listServices());
    process.exit(0);
  }

  // Validate service exists
  const serviceDef = SERVICES[command];
  if (!serviceDef) {
    process.stderr.write(`Unknown service: ${command}\n`);
    process.stderr.write(`Run: node scripts/einstein.mjs services\n`);
    process.exit(1);
  }

  // Load config
  const config = loadConfig();
  if (!config.privateKey) {
    process.stderr.write('Error: No private key configured.\n');
    process.stderr.write('Run: node scripts/einstein-setup.mjs\n');
    process.stderr.write('Or set EINSTEIN_X402_PRIVATE_KEY environment variable.\n');
    process.exit(1);
  }

  // Build request
  const body = buildRequestBody(serviceDef, args, config);
  const url = `${config.baseUrl}${serviceDef.path}`;
  const isRaw = args.raw === true;

  // Price info to stderr
  const rawPrice = PRICING[command] || '?';
  const price = isRaw ? rawPrice : (parseFloat(rawPrice) + 0.15).toFixed(2);
  process.stderr.write(`Querying: ${command} (${isRaw ? 'raw' : 'analyzed'}) — $${price} USDC\n`);
  process.stderr.write(`Endpoint: ${url}${isRaw ? '/raw' : ''}\n`);
  process.stderr.write(`Params: ${JSON.stringify(body)}\n`);

  try {
    const result = await x402Fetch(url, body, config.privateKey, { raw: isRaw });

    // Output JSON to stdout (for agent parsing)
    console.log(JSON.stringify(result.data, null, 2));

    // Payment info to stderr
    if (result.paid && result.paid !== '0') {
      process.stderr.write(`\nPaid: $${result.paid} USDC on Base\n`);
    }
    if (result.receipt) {
      process.stderr.write(`Receipt: ${result.receipt.substring(0, 80)}...\n`);
    }
  } catch (err) {
    process.stderr.write(`\nError: ${err.message}\n`);

    // Provide actionable guidance
    if (err.message.includes('insufficient') || err.message.includes('balance')) {
      process.stderr.write('\nInsufficient USDC balance on Base. Fund your wallet:\n');
      process.stderr.write('  Bridge USDC to Base via https://bridge.base.org\n');
    } else if (err.message.includes('402') && err.message.includes('no accepted')) {
      process.stderr.write('\nPayment challenge could not be parsed. The endpoint may be down.\n');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
      process.stderr.write('\nCannot reach emc2ai.io. Check your internet connection.\n');
    }

    process.exit(1);
  }
}

main();
