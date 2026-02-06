#!/usr/bin/env node
import { ApexClient, OMNI_PROD, OMNI_QA } from 'apexpro-connector-node';

function getEnv() {
  const env = (process.env.APEX_ENV || '').toLowerCase();
  const useTestnet = process.env.APEX_TESTNET === '1' || env === 'qa' || env === 'testnet';
  return useTestnet ? OMNI_QA : OMNI_PROD;
}

function normalizeSymbol(raw) {
  if (!raw) return raw;
  const upper = raw.toUpperCase();
  if (upper.endsWith('-PERP')) return upper.replace('-PERP', '-USDT');
  if (upper.endsWith('-SPOT')) return upper.replace('-SPOT', '-USDT');
  if (upper.includes('-')) return upper;
  if (upper.endsWith('USDT') || upper.endsWith('USDC') || upper.endsWith('USD')) {
    const suffix = upper.endsWith('USDT') ? 'USDT' : upper.endsWith('USDC') ? 'USDC' : 'USD';
    return `${upper.slice(0, -suffix.length)}-${suffix}`;
  }
  return `${upper}-USDT`;
}

function toPublicSymbol(symbol) {
  return symbol ? symbol.replace('-', '') : symbol;
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

const apexClient = new ApexClient.omni(getEnv());

console.log('Fetching current prices...\n');

const majors = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'AVAX-USDT', 'DOGE-USDT', 'ARB-USDT'];

console.log('=== MAJOR ASSETS ===');
for (const coin of majors) {
  const symbol = normalizeSymbol(coin);
  const ticker = await getTicker(apexClient, symbol);
  if (ticker?.lastPrice) {
    console.log(`${symbol.padEnd(12)} $${ticker.lastPrice}`);
  }
}

const metadata = await apexClient.publicApi.symbols();
const allSymbols = (metadata.contractConfig?.perpetualContract || [])
  .map((item) => item.symbol)
  .filter(Boolean);

console.log('\n=== AVAILABLE PERPS (first 20) ===');
for (const symbol of allSymbols.slice(0, 20)) {
  const ticker = await getTicker(apexClient, symbol);
  const price = ticker?.lastPrice || 'N/A';
  console.log(`${symbol.padEnd(12)} $${price}`);
}

console.log(`\nTotal perpetuals available: ${allSymbols.length}`);
