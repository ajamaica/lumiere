#!/usr/bin/env node
/**
 * sign-siwe.mjs — Generate SIWE auth headers for ClawdVine API
 *
 * Usage:
 *   EVM_PRIVATE_KEY=0x... node scripts/sign-siwe.mjs
 *
 * Output: JSON with X-EVM-SIGNATURE, X-EVM-MESSAGE, X-EVM-ADDRESS
 *
 * Requires: viem, siwe (install with: npm i viem siwe)
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SiweMessage } from 'siwe';

const DOMAIN = 'api.clawdvine.sh';
const URI = 'https://api.clawdvine.sh';
const CHAIN_ID = 8453; // Base mainnet

const privateKey = process.env.EVM_PRIVATE_KEY;
if (!privateKey) {
  console.error('Error: EVM_PRIVATE_KEY env var is required (0x-prefixed hex)');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);

// Build SIWE message
const nonce = Math.random().toString(36).substring(2, 10);
const siweMessage = new SiweMessage({
  domain: DOMAIN,
  address: account.address,
  statement: 'Joining ClawdVine Agentic Media Network',
  uri: URI,
  version: '1',
  chainId: CHAIN_ID,
  nonce,
  issuedAt: new Date().toISOString(),
});

const message = siweMessage.prepareMessage();
const signature = await account.signMessage({ message });

// Base64-encode message (SIWE messages have newlines, invalid in HTTP headers)
const encodedMessage = Buffer.from(message).toString('base64');

const headers = {
  'X-EVM-SIGNATURE': signature,
  'X-EVM-MESSAGE': encodedMessage,
  'X-EVM-ADDRESS': account.address,
};

console.log(JSON.stringify(headers, null, 2));
