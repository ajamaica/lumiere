#!/usr/bin/env node
/**
 * Check current positions and calculate P&L
 */
import { ApexClient, OMNI_PROD, OMNI_QA } from 'apexpro-connector-node';
import { readFileSync, writeFileSync } from 'fs';

function getEnv() {
  const env = (process.env.APEX_ENV || '').toLowerCase();
  const useTestnet = process.env.APEX_TESTNET === '1' || env === 'qa' || env === 'testnet';
  return useTestnet ? OMNI_QA : OMNI_PROD;
}

function toPublicSymbol(symbol) {
  return symbol ? symbol.replace('-', '') : symbol;
}

function getCredentials() {
  const key = process.env.APEX_API_KEY;
  const secret = process.env.APEX_API_SECRET;
  const passphrase = process.env.APEX_API_PASSPHRASE;
  const seed = process.env.APEX_OMNI_SEED || process.env.APEX_SEED;
  if (!key || !secret || !passphrase || !seed) {
    throw new Error('Missing APEX credentials. Set APEX_API_KEY, APEX_API_SECRET, APEX_API_PASSPHRASE, and APEX_OMNI_SEED.');
  }
  return { key, secret, passphrase, seed };
}

async function createPrivateClient() {
  const apexClient = new ApexClient.omni(getEnv());
  const credentials = getCredentials();
  await apexClient.init(
    {
      key: credentials.key,
      passphrase: credentials.passphrase,
      secret: credentials.secret,
    },
    credentials.seed,
  );
  return apexClient;
}

async function getTicker(apexClient, symbol) {
  const candidates = [toPublicSymbol(symbol), symbol].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const tickers = await apexClient.publicApi.tickers(candidate);
      if (Array.isArray(tickers) && tickers.length > 0) {
        return tickers[0];
      }
      if (tickers && tickers.symbol) {
        return tickers;
      }
    } catch (err) {
      continue;
    }
  }
  return null;
}

const stateFile = new URL('./trading-state.json', import.meta.url).pathname;

async function main() {
  console.log('=== APEX POSITION CHECK ===\n');

  const apexClient = await createPrivateClient();
  const address = apexClient.user?.ethereumAddress;

  if (!address) {
    console.error('Error: No wallet address available');
    process.exit(1);
  }

  console.log(`Checking address: ${address}\n`);

  const balance = await apexClient.privateApi.accountBalance();
  const metadata = await apexClient.publicApi.symbols();
  const tokenBySymbol = new Map(
    (metadata.contractConfig?.perpetualContract || [])
      .filter((item) => item?.symbol)
      .map((item) => [item.symbol, item.token || ''])
  );
  const positions = (apexClient.account?.positions || []).filter((pos) => {
    const size = Math.abs(parseFloat(pos.size || '0'));
    return size > 0;
  });

  console.log('Account Status:');
  console.log(`  Equity: $${balance.totalEquityValue}`);
  console.log(`  Available: $${balance.availableBalance}`);
  console.log(`  Initial Margin: $${balance.initialMargin}`);
  console.log(`  Maintenance Margin: $${balance.maintenanceMargin}`);

  if (positions.length > 0) {
    console.log('\n=== OPEN POSITIONS ===');
    for (const pos of positions) {
      const symbol = pos.symbol;
      const token = pos.token || tokenBySymbol.get(symbol) || '';
      const ticker = await getTicker(apexClient, symbol);
      const currentPrice = parseFloat(ticker?.lastPrice || '0');
      const entryPrice = parseFloat(pos.entryPrice || '0');
      const size = Math.abs(parseFloat(pos.size || '0'));
      const side = (pos.side || '').toUpperCase();
      const direction = side === 'SELL' || side === 'SHORT' ? -1 : 1;
      const pnl = (currentPrice - entryPrice) * size * direction;
      const pnlPct = entryPrice > 0 ? (pnl / (size * entryPrice)) * 100 : 0;

      console.log(`\n${symbol}:`);
      console.log(`  Direction: ${direction > 0 ? 'LONG' : 'SHORT'}`);
      if (token) {
        console.log(`  Token: ${token}`);
      }
      console.log(`  Size: ${size}`);
      console.log(`  Entry: $${entryPrice}`);
      console.log(`  Current: $${currentPrice}`);
      console.log(`  P&L: $${pnl.toFixed(2)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);

      if (pnlPct >= 2) {
        console.log('  PROFIT TARGET HIT! Consider taking profit.');
      } else if (pnlPct <= -1) {
        console.log('  STOP LOSS HIT! Consider closing position.');
      }
    }
  } else {
    console.log('\nNo open positions');
  }

  console.log('\n=== CURRENT PRICES ===');
  const btc = await getTicker(apexClient, 'BTC-USDT');
  const eth = await getTicker(apexClient, 'ETH-USDT');
  const sol = await getTicker(apexClient, 'SOL-USDT');
  console.log(`BTC-USDT: $${btc?.lastPrice || 'N/A'}`);
  console.log(`ETH-USDT: $${eth?.lastPrice || 'N/A'}`);
  console.log(`SOL-USDT: $${sol?.lastPrice || 'N/A'}`);

  try {
    let tradingState = null;
    try {
      tradingState = JSON.parse(readFileSync(stateFile, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      tradingState = { parameters: {} };
    }
    tradingState.last_check = new Date().toISOString();
    tradingState.current_positions = positions;
    tradingState.parameters.account_size = parseFloat(balance.totalEquityValue || '0');
    writeFileSync(stateFile, JSON.stringify(tradingState, null, 2));
    console.log('\nTrading state updated');
  } catch (err) {
    console.log('\nCould not update trading state:', err.message);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
