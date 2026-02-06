#!/usr/bin/env node

import { chmod, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Wallet } from 'ethers';

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

const DEFAULT_STORE_DIR = '.openclawbot';
const DEFAULT_WALLET_FILE = 'wallet.json';
const DEFAULT_RECIPIENT_FILE = 'recipient.txt';
const DEFAULT_ADDRESS_FILE = 'wallet-address.txt';

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

const readFileText = async (path) => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    fail(`Failed to read ${path}: ${error.message}`);
    return '';
  }
};

const fileExists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const writeSecureFile = async (path, contents) => {
  await writeFile(path, contents);
  await chmod(path, 0o600);
};

const getPassphrase = async () => {
  if (args['passphrase-file']) {
    const content = await readFileText(args['passphrase-file']);
    const trimmed = content.trimEnd();
    if (!trimmed) {
      fail('Passphrase file is empty.');
    }
    return trimmed;
  }
  if (args.passphrase) {
    return args.passphrase;
  }
  fail('Missing --passphrase or --passphrase-file');
  return '';
};

const usage = () => {
  console.log(`Usage:
  create --passphrase <secret> [--out-dir .openclawbot] [--wallet-file wallet.json] [--address-file wallet-address.txt] [--recipient 0x...] [--set-recipient-from-wallet] [--force]
  create --passphrase-file ./passphrase.txt [--out-dir .openclawbot] [--wallet-file wallet.json] [--address-file wallet-address.txt] [--recipient 0x...] [--set-recipient-from-wallet] [--force]
  import --pk 0xPRIVATE_KEY --passphrase <secret> [--out-dir .openclawbot] [--wallet-file wallet.json] [--address-file wallet-address.txt] [--recipient 0x...] [--set-recipient-from-wallet] [--force]
  import --pk-file ./payer.pk --passphrase-file ./passphrase.txt [--out-dir .openclawbot] [--wallet-file wallet.json] [--address-file wallet-address.txt] [--recipient 0x...] [--set-recipient-from-wallet] [--force]
  recipient --address 0x... [--out-dir .openclawbot] [--recipient-file recipient.txt]

Examples:
  node scripts/moltbot-wallet-setup.mjs create --passphrase-file ./passphrase.txt --set-recipient-from-wallet
  node scripts/moltbot-wallet-setup.mjs import --pk-file ./payer.pk --passphrase-file ./passphrase.txt --set-recipient-from-wallet
  node scripts/moltbot-wallet-setup.mjs recipient --address 0xYourWallet
`);
};

const run = async () => {
  if (!command || command === 'help') {
    usage();
    return;
  }

  if (command === 'create') {
    const passphrase = await getPassphrase();
    const outDir = args['out-dir'] ?? DEFAULT_STORE_DIR;
    const walletFile = args['wallet-file'] ?? DEFAULT_WALLET_FILE;
    const addressFile = args['address-file'] ?? DEFAULT_ADDRESS_FILE;
    const recipientFile = args['recipient-file'] ?? DEFAULT_RECIPIENT_FILE;
    const force = Boolean(args.force);

    await mkdir(outDir, { recursive: true });

    const walletPath = resolve(outDir, walletFile);
    const addressPath = resolve(outDir, addressFile);
    const recipientPath = resolve(outDir, recipientFile);

    if (!force && await fileExists(walletPath)) {
      fail(`Wallet file already exists: ${walletPath} (use --force to overwrite)`);
    }

    const wallet = Wallet.createRandom();
    const encrypted = await wallet.encrypt(passphrase);

    await writeSecureFile(walletPath, encrypted);
    await writeSecureFile(addressPath, `${wallet.address}\n`);

    let storedRecipient = null;
    if (args.recipient) {
      storedRecipient = args.recipient;
    } else if (args['set-recipient-from-wallet']) {
      storedRecipient = wallet.address;
    }

    if (storedRecipient) {
      await writeSecureFile(recipientPath, `${storedRecipient}\n`);
    }

    console.log('Wallet created.');
    console.log(JSON.stringify({
      walletAddress: wallet.address,
      walletFile: walletPath,
      walletAddressFile: addressPath,
      recipientFile: storedRecipient ? recipientPath : null,
    }, null, 2));
    return;
  }

  if (command === 'import') {
    const passphrase = await getPassphrase();
    const outDir = args['out-dir'] ?? DEFAULT_STORE_DIR;
    const walletFile = args['wallet-file'] ?? DEFAULT_WALLET_FILE;
    const addressFile = args['address-file'] ?? DEFAULT_ADDRESS_FILE;
    const recipientFile = args['recipient-file'] ?? DEFAULT_RECIPIENT_FILE;
    const force = Boolean(args.force);

    const pk = args.pk ?? (args['pk-file'] ? (await readFileText(args['pk-file'])).trim() : '');
    if (!pk) {
      fail('Missing --pk or --pk-file');
    }

    await mkdir(outDir, { recursive: true });

    const walletPath = resolve(outDir, walletFile);
    const addressPath = resolve(outDir, addressFile);
    const recipientPath = resolve(outDir, recipientFile);

    if (!force && await fileExists(walletPath)) {
      fail(`Wallet file already exists: ${walletPath} (use --force to overwrite)`);
    }

    const wallet = new Wallet(pk);
    const encrypted = await wallet.encrypt(passphrase);

    await writeSecureFile(walletPath, encrypted);
    await writeSecureFile(addressPath, `${wallet.address}\n`);

    let storedRecipient = null;
    if (args.recipient) {
      storedRecipient = args.recipient;
    } else if (args['set-recipient-from-wallet']) {
      storedRecipient = wallet.address;
    }

    if (storedRecipient) {
      await writeSecureFile(recipientPath, `${storedRecipient}\n`);
    }

    console.log('Wallet imported.');
    console.log(JSON.stringify({
      walletAddress: wallet.address,
      walletFile: walletPath,
      walletAddressFile: addressPath,
      recipientFile: storedRecipient ? recipientPath : null,
    }, null, 2));
    return;
  }

  if (command === 'recipient') {
    const recipient = requireArg('address');
    const outDir = args['out-dir'] ?? DEFAULT_STORE_DIR;
    const recipientFile = args['recipient-file'] ?? DEFAULT_RECIPIENT_FILE;

    await mkdir(outDir, { recursive: true });

    const recipientPath = resolve(outDir, recipientFile);
    await writeSecureFile(recipientPath, `${recipient}\n`);

    console.log('Recipient saved.');
    console.log(JSON.stringify({
      recipient,
      recipientFile: recipientPath,
    }, null, 2));
    return;
  }

  fail(`Unknown command: ${command}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
