#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = 'https://api.paytrigo.net';
const DEFAULT_API_KEY = 'sk_live_M4vDBePQLu8Uenl-b2_7_jMvh5y9sFi3FH9yuh0nwes';
const argv = process.argv.slice(2);
const command = argv[0];

const parseArgs = (input) => {
  const args = {};
  for (let i = 0; i < input.length; i += 1) {
    const item = input[i];
    if (!item.startsWith('--')) {
      continue;
    }
    const raw = item.slice(2);
    const eqIndex = raw.indexOf('=');
    if (eqIndex !== -1) {
      const key = raw.slice(0, eqIndex);
      const value = raw.slice(eqIndex + 1);
      args[key] = value;
      continue;
    }
    const key = raw;
    const value = input[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
};

const args = parseArgs(argv.slice(1));
const API_KEY = DEFAULT_API_KEY;

const DEFAULT_STORE_DIR = '.openclawbot';
const DEFAULT_RECIPIENT_FILE = 'recipient.txt';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const requireArg = (key) => {
  if (!args[key]) {
    fail(`Missing --${key}`);
  }
  return args[key];
};

const readOptionalFile = async (path) => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    fail(`Failed to read ${path}: ${error.message}`);
    return null;
  }
};

const getRecipientAddress = async () => {
  if (args.recipient || args['recipient-address']) {
    return args.recipient ?? args['recipient-address'];
  }
  const storeDir = args['store-dir'] ?? DEFAULT_STORE_DIR;
  const recipientFile = args['recipient-file'] ?? resolve(storeDir, DEFAULT_RECIPIENT_FILE);
  const contents = await readOptionalFile(recipientFile);
  if (!contents) {
    fail('Missing --recipient (or set --recipient-file / .openclawbot/recipient.txt)');
  }
  const value = contents.trim();
  if (!value) {
    fail('Recipient file is empty.');
  }
  return value;
};

const getHeaders = (useCheckoutToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (useCheckoutToken) {
    headers['X-Checkout-Token'] = useCheckoutToken;
  } else if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return headers;
};

const request = async (method, path, body, headers) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    fail(`${res.status} ${res.statusText}\n${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const baseChain = args.chain ?? 'base';
const baseToken = args.token ?? 'usdc';

const run = async () => {
  if (!command || command === 'help') {
    console.log(`Usage:
  create --amount 49.99 [--recipient 0x...] [--recipient-file ./recipient.txt] [--store-dir .openclawbot] [--ttl 900] [--metadata '{"botId":"openclawbot_123"}']
  intent --invoice inv_... --checkout-token chk_...
  submit --invoice inv_... --checkout-token chk_... --tx 0x... [--payer 0x...]
  status --invoice inv_... --checkout-token chk_...
`);
    return;
  }

  if (command === 'create') {
    const amount = requireArg('amount');
    const recipientAddress = await getRecipientAddress();
    const ttlSeconds = args.ttl ? Number(args.ttl) : undefined;
    let metadata = undefined;
    if (args.metadata) {
      try {
        metadata = JSON.parse(args.metadata);
      } catch {
        fail('Invalid JSON for --metadata');
      }
    }
    const idempotency = args.idempotency ?? `pay_attempt_${randomUUID()}`;
    const headers = {
      ...getHeaders(null),
      'Idempotency-Key': idempotency,
    };
    const body = {
      amount,
      recipientAddress,
      ttlSeconds,
      metadata,
    };
    const result = await request('POST', '/v1/invoices', body, headers);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'intent') {
    const invoiceId = requireArg('invoice');
    const checkoutToken = args['checkout-token'] ?? '';
    if (!checkoutToken && !API_KEY) {
      fail('Provide --checkout-token or set PAYTRIGO_API_KEY');
    }
    const headers = getHeaders(checkoutToken || null);
    const query = `?chain=${encodeURIComponent(baseChain)}&token=${encodeURIComponent(baseToken)}`;
    const result = await request('GET', `/v1/invoices/${invoiceId}/intent${query}`, undefined, headers);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'submit') {
    const invoiceId = requireArg('invoice');
    const txHash = requireArg('tx');
    const checkoutToken = args['checkout-token'] ?? '';
    if (!checkoutToken && !API_KEY) {
      fail('Provide --checkout-token or set PAYTRIGO_API_KEY');
    }
    const headers = getHeaders(checkoutToken || null);
    const body = {
      txHash,
      payerAddress: args.payer ?? undefined,
      chain: baseChain,
      token: baseToken,
    };
    const result = await request('POST', `/v1/invoices/${invoiceId}/payment-intents`, body, headers);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'status') {
    const invoiceId = requireArg('invoice');
    const checkoutToken = args['checkout-token'] ?? '';
    if (!checkoutToken && !API_KEY) {
      fail('Provide --checkout-token or set PAYTRIGO_API_KEY');
    }
    const headers = getHeaders(checkoutToken || null);
    const result = await request('GET', `/v1/invoices/${invoiceId}`, undefined, headers);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  fail(`Unknown command: ${command}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
