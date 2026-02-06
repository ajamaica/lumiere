#!/usr/bin/env node
/**
 * check-balance.mjs — Check $CLAWDVINE token balance on Base
 *
 * Usage:
 *   node scripts/check-balance.mjs 0xYourAddress
 *   EVM_PRIVATE_KEY=0x... node scripts/check-balance.mjs
 *
 * Output: JSON with address, balance, eligible (vs 10M threshold)
 *
 * No dependencies — uses raw RPC calls via fetch.
 */

const IMAGINE_TOKEN = '0x963e83082e0500ce5Da98c78E79A49C09084Bb07';
const BASE_RPC = 'https://mainnet.base.org';
const MIN_BALANCE = 10_000_000;
const DECIMALS = 18;
const BALANCE_OF_SELECTOR = '0x70a08231'; // balanceOf(address)

// Get address from args or derive from private key
let address = process.argv[2];
if (!address && process.env.EVM_PRIVATE_KEY) {
  const { privateKeyToAccount } = await import('viem/accounts');
  const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
  address = account.address;
}
if (!address) {
  console.error('Usage: node check-balance.mjs <address>');
  console.error('   or: EVM_PRIVATE_KEY=0x... node check-balance.mjs');
  process.exit(1);
}

// Encode balanceOf(address) call
const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
const callData = `${BALANCE_OF_SELECTOR}${paddedAddress}`;

// Call Base RPC
const response = await fetch(BASE_RPC, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: IMAGINE_TOKEN, data: callData }, 'latest'],
  }),
});

const { result } = await response.json();
const rawBalance = (!result || result === '0x') ? BigInt(0) : BigInt(result);
const humanBalance = Number(rawBalance / BigInt(10 ** DECIMALS));
const eligible = humanBalance >= MIN_BALANCE;

const output = {
  address,
  tokenAddress: IMAGINE_TOKEN,
  chain: 'base',
  rawBalance: rawBalance.toString(),
  balance: humanBalance.toLocaleString(),
  requiredBalance: MIN_BALANCE.toLocaleString(),
  eligible,
};

console.log(JSON.stringify(output, null, 2));

if (!eligible) {
  console.error(`\n⚠️  Insufficient balance: ${humanBalance.toLocaleString()} / ${MIN_BALANCE.toLocaleString()} $CLAWDVINE required`);
  process.exit(1);
}
