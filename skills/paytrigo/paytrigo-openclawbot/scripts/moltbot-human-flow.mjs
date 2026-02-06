#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = 'https://api.paytrigo.net';
const API_KEY = 'sk_live_EQRe18nZCjXZSv8BmSJMs5mYvMOw1wgDd2RHnOH5T28';

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

const args = parseArgs(argv);

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
  if (args.recipient) {
    return args.recipient;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const usage = () => {
  console.log(`Usage:
  human --amount 0.001 [--recipient 0xYourWallet] [--recipient-file ./recipient.txt] [--store-dir .openclawbot] [--ttl 900] [--metadata '{"botId":"openclawbot_123"}'] [--poll 5] [--max-minutes 20]

Example:
  node scripts/moltbot-human-flow.mjs human --amount 0.001 --recipient 0xYourWallet
  node scripts/moltbot-human-flow.mjs human --amount 0.001 --store-dir .openclawbot
`);
};

const run = async () => {
  if (!command || command === 'help') {
    usage();
    return;
  }

  if (command !== 'human') {
    fail(`Unknown command: ${command}`);
  }

  const amount = requireArg('amount');
  const recipientAddress = await getRecipientAddress();
  const ttlSeconds = args.ttl ? Number(args.ttl) : undefined;
  const pollSeconds = args.poll ? Number(args.poll) : 5;
  const maxMinutes = args['max-minutes'] ? Number(args['max-minutes']) : 20;
  let metadata = undefined;
  if (args.metadata) {
    try {
      metadata = JSON.parse(args.metadata);
    } catch {
      fail('Invalid JSON for --metadata');
    }
  }

  const idempotency = args.idempotency ?? `pay_attempt_${randomUUID()}`;

  const createHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotency,
  };

  const createBody = {
    amount,
    recipientAddress,
    ttlSeconds,
    metadata,
  };

  const invoice = await request('POST', '/v1/invoices', createBody, createHeaders);

  console.log('Invoice created');
  console.log(JSON.stringify({
    invoiceId: invoice.invoiceId,
    payUrl: invoice.payUrl,
    checkoutToken: invoice.checkoutToken,
    expiresAt: invoice.expiresAt,
  }, null, 2));

  if (args['no-poll']) {
    return;
  }

  const statusHeaders = {
    'X-Checkout-Token': invoice.checkoutToken,
  };

  const doneStatuses = new Set(['confirmed', 'expired', 'invalid', 'refunded']);
  let lastStatus = null;
  const deadline = Date.now() + maxMinutes * 60 * 1000;

  while (Date.now() < deadline) {
    const status = await request('GET', `/v1/invoices/${invoice.invoiceId}`, undefined, statusHeaders);
    if (status.status !== lastStatus) {
      lastStatus = status.status;
      console.log(`[status] ${lastStatus}`);
    }
    if (doneStatuses.has(status.status)) {
      console.log('Final status reached.');
      return;
    }
    await sleep(pollSeconds * 1000);
  }

  console.log('Polling ended (max time reached).');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
