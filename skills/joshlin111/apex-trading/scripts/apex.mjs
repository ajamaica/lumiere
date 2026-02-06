#!/usr/bin/env node
/**
 * ApeX CLI - Trading and portfolio management
 * Using ApeX Pro Omni connector SDK
 */
import { ApexClient, OMNI_PROD, OMNI_QA } from 'apexpro-connector-node';
import BigNumber from 'bignumber.js';

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

function calculateLimitFee(price, size, feeRate, precision) {
  const fee = new BigNumber(price || 0).times(size || 0).times(feeRate || 0);
  const digits = Number.isFinite(precision) ? precision : 8;
  return fee.toFixed(digits, BigNumber.ROUND_UP);
}

async function createPublicClient() {
  return new ApexClient.omni(getEnv());
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

async function getTickerPrice(apexClient, symbol) {
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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
ApeX CLI - Trading and Portfolio Management

ENVIRONMENT VARIABLES:
  APEX_API_KEY            API key for private endpoints
  APEX_API_SECRET         API secret for private endpoints
  APEX_API_PASSPHRASE     API passphrase for private endpoints
  APEX_OMNI_SEED          Omni seed for signing
  APEX_TESTNET            Set to '1' for testnet (QA)
  APEX_ENV                'qa' or 'prod' (optional)

READ OPERATIONS (no API key needed):
  price <coin>                   Get current price for a coin
  meta                           List available perpetual symbols

PRIVATE OPERATIONS (requires API credentials):
  balance                        Show account balance and equity
  positions                      Show open positions
  orders                         Show open orders
  fills                          Show trade history
  market-buy <coin> <size>       Market buy
  market-sell <coin> <size>      Market sell
  limit-buy <coin> <size> <price>   Place limit buy order
  limit-sell <coin> <size> <price>  Place limit sell order
  cancel-all [coin]              Cancel all orders (optionally for one coin)

EXAMPLES:
  node scripts/apex.mjs price BTC
  node scripts/apex.mjs meta

  export APEX_API_KEY=...
  export APEX_API_SECRET=...
  export APEX_API_PASSPHRASE=...
  export APEX_OMNI_SEED=...
  node scripts/apex.mjs balance
  node scripts/apex.mjs market-buy SOL 0.1
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'price': {
        const symbol = normalizeSymbol(args[1]);
        if (!symbol) throw new Error('Coin required');
        const apexClient = await createPublicClient();
        const ticker = await getTickerPrice(apexClient, symbol);
        if (!ticker) throw new Error(`Unknown symbol: ${symbol}`);
        console.log(ticker.lastPrice || ticker.indexPrice || ticker.oraclePrice);
        break;
      }

      case 'meta': {
        const apexClient = await createPublicClient();
        const metadata = await apexClient.publicApi.symbols();
        const symbols = (metadata.contractConfig?.perpetualContract || [])
          .map((item) => item.symbol)
          .filter(Boolean);
        console.log(JSON.stringify(symbols, null, 2));
        break;
      }

      case 'balance': {
        const apexClient = await createPrivateClient();
        const balance = await apexClient.privateApi.accountBalance();
        console.log(JSON.stringify(balance, null, 2));
        break;
      }

      case 'positions': {
        const apexClient = await createPrivateClient();
        const positions = apexClient.account?.positions || [];
        console.log(JSON.stringify(positions, null, 2));
        break;
      }

      case 'orders': {
        const apexClient = await createPrivateClient();
        const { orders } = await apexClient.privateApi.openOrders();
        console.log(JSON.stringify(orders || [], null, 2));
        break;
      }

      case 'fills': {
        const apexClient = await createPrivateClient();
        const { orders } = await apexClient.privateApi.tradeHistory();
        console.log(JSON.stringify(orders || [], null, 2));
        break;
      }

      case 'market-buy':
      case 'market-sell': {
        const apexClient = await createPrivateClient();
        const symbol = normalizeSymbol(args[1]);
        const size = args[2];
        if (!symbol || !size) {
          throw new Error(`Usage: apex ${command} <coin> <size>`);
        }

        const side = command === 'market-buy' ? 'BUY' : 'SELL';
        const symbolInfo = apexClient.symbols?.[symbol];
        if (!symbolInfo?.l2PairId) {
          throw new Error(`Unknown symbol: ${symbol}`);
        }

        let price = '';
        try {
          const worst = await apexClient.privateApi.getWorstPrice(symbol, size, side);
          price = worst?.worstPrice || '';
        } catch (err) {
          const ticker = await getTickerPrice(apexClient, symbol);
          price = ticker?.lastPrice || '';
        }

        if (!price) throw new Error(`Unable to determine price for ${symbol}`);

        const makerFeeRate = apexClient.account?.contractAccount?.makerFeeRate || '0';
        const takerFeeRate = apexClient.account?.contractAccount?.takerFeeRate || '0';
        const limitFee = calculateLimitFee(price, size, takerFeeRate, symbolInfo.baseCoinRealPrecision);

        const order = {
          pairId: symbolInfo.l2PairId,
          makerFeeRate,
          takerFeeRate,
          symbol,
          side,
          type: 'MARKET',
          size: String(size),
          price: String(price),
          limitFee,
          reduceOnly: false,
          timeInForce: 'IMMEDIATE_OR_CANCEL',
          expiration: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60),
        };

        const result = await apexClient.privateApi.createOrder(order);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'limit-buy':
      case 'limit-sell': {
        const apexClient = await createPrivateClient();
        const symbol = normalizeSymbol(args[1]);
        const size = args[2];
        const price = args[3];
        if (!symbol || !size || !price) {
          throw new Error(`Usage: apex ${command} <coin> <size> <price>`);
        }

        const side = command === 'limit-buy' ? 'BUY' : 'SELL';
        const symbolInfo = apexClient.symbols?.[symbol];
        if (!symbolInfo?.l2PairId) {
          throw new Error(`Unknown symbol: ${symbol}`);
        }

        const makerFeeRate = apexClient.account?.contractAccount?.makerFeeRate || '0';
        const takerFeeRate = apexClient.account?.contractAccount?.takerFeeRate || '0';
        const limitFee = calculateLimitFee(price, size, takerFeeRate, symbolInfo.baseCoinRealPrecision);

        const order = {
          pairId: symbolInfo.l2PairId,
          makerFeeRate,
          takerFeeRate,
          symbol,
          side,
          type: 'LIMIT',
          size: String(size),
          price: String(price),
          limitFee,
          reduceOnly: false,
          timeInForce: 'GOOD_TIL_CANCEL',
          expiration: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60),
        };

        const result = await apexClient.privateApi.createOrder(order);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'cancel-all': {
        const apexClient = await createPrivateClient();
        const symbol = args[1] ? normalizeSymbol(args[1]) : undefined;
        await apexClient.privateApi.cancelAllOrder(symbol);
        console.log(JSON.stringify({ status: 'ok', symbol: symbol || 'ALL' }, null, 2));
        break;
      }

      default: {
        console.error(`Unknown command: ${command}`);
        console.log('Run "apex help" for usage');
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
