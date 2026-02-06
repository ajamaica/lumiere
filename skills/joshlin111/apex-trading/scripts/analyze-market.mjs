#!/usr/bin/env node
/**
 * Get historical candles and volume for technical analysis
 */
import { ApexClient, OMNI_PROD, OMNI_QA } from 'apexpro-connector-node';

function getEnv() {
  const env = (process.env.APEX_ENV || '').toLowerCase();
  const useTestnet = process.env.APEX_TESTNET === '1' || env === 'qa' || env === 'testnet';
  return useTestnet ? OMNI_QA : OMNI_PROD;
}

const apexClient = new ApexClient.omni(getEnv());

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

function normalizeInterval(interval) {
  const match = interval.match(/^(\d+)([mhd])$/i);
  if (!match) return '15';
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return String(value);
  if (unit === 'h') {
    const minutes = value * 60;
    return String(minutes);
  }
  if (unit === 'd') return 'D';
  return '15';
}

async function analyzeCoin(coin, interval = '15m', lookback = 20) {
  const symbol = normalizeSymbol(coin);
  const publicSymbol = toPublicSymbol(symbol);
  const apexInterval = normalizeInterval(interval);

  console.log(`\n=== ${symbol} Analysis (${interval} candles) ===\n`);

  let candles = [];
  for (const candidate of [publicSymbol, symbol]) {
    try {
      candles = await apexClient.publicApi.klines(
        candidate,
        apexInterval,
        undefined,
        undefined,
        lookback,
      );
      if (candles && candles.length > 0) break;
    } catch (err) {
      continue;
    }
  }

  if (!candles || candles.length === 0) {
    console.log('No candle data available');
    return null;
  }

  const recentCandles = candles.slice(-5);
  console.log('Recent Candles:');
  console.log('Time                 Open      High      Low       Close     Volume');
  console.log('-'.repeat(80));

  for (const c of recentCandles) {
    const time = new Date(c.t).toLocaleTimeString();
    console.log(
      `${time.padEnd(20)} ${c.o.padEnd(9)} ${c.h.padEnd(9)} ${c.l.padEnd(9)} ${c.c.padEnd(9)} ${c.v}`,
    );
  }

  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const current = parseFloat(latest.c);
  const prev = parseFloat(previous.c);
  const change = ((current - prev) / prev) * 100;

  const avgVolume = candles.slice(-10).reduce((sum, c) => sum + parseFloat(c.v), 0) / 10;
  const currentVolume = parseFloat(latest.v);
  const volumeRatio = currentVolume / avgVolume;

  console.log('\nMetrics:');
  console.log(`  Current Price: $${current}`);
  console.log(`  Change (${interval}): ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
  console.log(`  Current Volume: ${currentVolume.toFixed(2)}`);
  console.log(`  Avg Volume (10 bars): ${avgVolume.toFixed(2)}`);
  console.log(`  Volume Ratio: ${volumeRatio.toFixed(2)}x`);

  const priceUp = change > 0;
  const volumeUp = volumeRatio > 1.2;

  console.log('\nMomentum Signal:');
  if (priceUp && volumeUp) {
    console.log('  BULLISH - Price up with high volume (strong momentum)');
  } else if (priceUp && !volumeUp) {
    console.log('  WEAK BULLISH - Price up but low volume (weak momentum)');
  } else if (!priceUp && volumeUp) {
    console.log('  BEARISH - Price down with high volume (strong selling)');
  } else {
    console.log('  NEUTRAL - No clear momentum');
  }

  const highs = candles.slice(-20).map((c) => parseFloat(c.h));
  const lows = candles.slice(-20).map((c) => parseFloat(c.l));
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  console.log('\nLevels:');
  console.log(`  Resistance: $${resistance} (${((resistance - current) / current * 100).toFixed(2)}% away)`);
  console.log(`  Support: $${support} (${((current - support) / current * 100).toFixed(2)}% away)`);

  return {
    coin: symbol,
    current,
    change,
    volumeRatio,
    signal: priceUp && volumeUp ? 'bullish' : !priceUp && volumeUp ? 'bearish' : 'neutral',
    resistance,
    support,
  };
}

const coins = process.argv.slice(2);
if (coins.length === 0) {
  coins.push('BTC-USDT', 'ETH-USDT');
}

for (const coin of coins) {
  try {
    await analyzeCoin(coin);
  } catch (err) {
    console.error(`Error analyzing ${coin}:`, err.message);
  }
}

console.log('\n' + '='.repeat(80));
