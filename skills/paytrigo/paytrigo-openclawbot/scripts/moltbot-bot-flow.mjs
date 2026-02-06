#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JsonRpcProvider, Wallet } from 'ethers';

const API_BASE = 'https://api.paytrigo.net';
const API_KEY = 'sk_live_EQRe18nZCjXZSv8BmSJMs5mYvMOw1wgDd2RHnOH5T28';
const DEFAULT_RPC = 'https://mainnet.base.org';

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
const DEFAULT_WALLET_FILE = 'wallet.json';

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

const readRequiredFile = async (path) => {
  const contents = await readOptionalFile(path);
  if (!contents) {
    fail(`Missing file: ${path}`);
  }
  return contents;
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

const getPassphrase = async () => {
  if (args['passphrase-file']) {
    const value = (await readRequiredFile(args['passphrase-file'])).trimEnd();
    if (!value) {
      fail('Passphrase file is empty.');
    }
    return value;
  }
  if (args.passphrase) {
    return args.passphrase;
  }
  fail('Missing --passphrase or --passphrase-file (required to decrypt wallet)');
  return '';
};

const getWallet = async () => {
  if (args.pk) {
    return new Wallet(args.pk);
  }
  const storeDir = args['store-dir'] ?? DEFAULT_STORE_DIR;
  const walletFile = args['wallet-file'] ?? resolve(storeDir, DEFAULT_WALLET_FILE);
  const walletJson = await readOptionalFile(walletFile);
  if (!walletJson) {
    fail('Missing --pk (or set --wallet-file / .openclawbot/wallet.json)');
  }
  const passphrase = await getPassphrase();
  return Wallet.fromEncryptedJson(walletJson, passphrase);
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
  bot --amount 0.001 [--recipient 0xSellerWallet] [--recipient-file ./recipient.txt] [--store-dir .openclawbot] (--pk 0xPRIVATE_KEY | --wallet-file ./wallet.json --passphrase <secret> | --passphrase-file ./passphrase.txt) [--rpc https://mainnet.base.org] [--ttl 900] [--metadata '{"botId":"openclawbot_123"}'] [--poll 5] [--max-minutes 20] [--skip-approve]

Example:
  node scripts/moltbot-bot-flow.mjs bot --amount 0.001 --recipient 0xSellerWallet --pk 0x...
  node scripts/moltbot-bot-flow.mjs bot --amount 0.001 --store-dir .openclawbot --passphrase-file ./passphrase.txt
`);
};

const sendStep = async (wallet, step, label) => {
  const tx = await wallet.sendTransaction({
    to: step.to,
    data: step.data,
    value: BigInt(step.value ?? '0'),
  });
  console.log(`[${label}] txHash: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[${label}] confirmed in block ${receipt.blockNumber}`);
  return tx.hash;
};

const run = async () => {
  if (!command || command === 'help') {
    usage();
    return;
  }

  if (command !== 'bot') {
    fail(`Unknown command: ${command}`);
  }

  const amount = requireArg('amount');
  const recipientAddress = await getRecipientAddress();
  const rpcUrl = args.rpc ?? DEFAULT_RPC;
  const ttlSeconds = args.ttl ? Number(args.ttl) : undefined;
  const pollSeconds = args.poll ? Number(args.poll) : 5;
  const maxMinutes = args['max-minutes'] ? Number(args['max-minutes']) : 20;
  const skipApprove = Boolean(args['skip-approve']);
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

  const intentHeaders = {
    'X-Checkout-Token': invoice.checkoutToken,
  };

  const intent = await request(
    'GET',
    `/v1/invoices/${invoice.invoiceId}/intent?chain=base&token=usdc`,
    undefined,
    intentHeaders,
  );

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = (await getWallet()).connect(provider);

  if (!skipApprove && intent.steps?.approve) {
    await sendStep(wallet, intent.steps.approve, 'approve');
  }

  const payTxHash = await sendStep(wallet, intent.steps.pay, 'pay');

  const submitHeaders = {
    'X-Checkout-Token': invoice.checkoutToken,
    'Content-Type': 'application/json',
  };

  const submitBody = {
    txHash: payTxHash,
    payerAddress: wallet.address,
    chain: 'base',
    token: 'usdc',
  };

  const submit = await request(
    'POST',
    `/v1/invoices/${invoice.invoiceId}/payment-intents`,
    submitBody,
    submitHeaders,
  );

  console.log('Payment intent submitted');
  console.log(JSON.stringify(submit, null, 2));

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
