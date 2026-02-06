#!/usr/bin/env node

/**
 * Solana Transfer Skill for OpenClaw
 * 
 * Allows agents to send SOL and SPL tokens on Solana blockchain.
 * Requires a keypair and RPC endpoint configured.
 */

import {
  getOrCreateAssociatedTokenAccount,
  transfer,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { existsSync,readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load config
const CONFIG_PATH = process.env.SOLANA_CONFIG || join(__dirname, 'config.json');
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR || join(__dirname, 'keypair.json');

let config = {
  rpc: 'https://api.mainnet-beta.solana.com',
  network: 'mainnet-beta',
};

if (existsSync(CONFIG_PATH)) {
  try {
    config = { ...config, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {
    console.error('Warning: Could not parse config.json, using defaults');
  }
}

// Load keypair
let keypair;
if (!existsSync(KEYPAIR_PATH)) {
  console.error(`Error: keypair.json not found at ${KEYPAIR_PATH}`);
  console.error('Generate with: solana-keygen new --outfile keypair.json');
  process.exit(1);
}

try {
  const keypairData = JSON.parse(readFileSync(KEYPAIR_PATH, 'utf8'));
  keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
} catch (e) {
  console.error(`Error loading keypair: ${e.message}`);
  process.exit(1);
}

const connection = new Connection(config.rpc, 'confirmed');

/**
 * Send SOL (native token) to a recipient
 */
async function sendSOL(recipientAddress, lamports) {
  const recipient = new PublicKey(recipientAddress);
  const sender = keypair.publicKey;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports: parseInt(lamports),
    })
  );

  const blockHash = await connection.getLatestBlockhash();
  transaction.feePayer = sender;
  transaction.recentBlockhash = blockHash.blockhash;

  const signature = await connection.sendTransaction(transaction, [keypair]);
  const confirmation = await connection.confirmTransaction(signature);

  return {
    success: true,
    signature,
    amount: (lamports / 1e9).toFixed(9),
    unit: 'SOL',
    recipient: recipientAddress,
    confirmation,
  };
}

/**
 * Send SPL tokens to a recipient
 */
async function sendSPLToken(recipientAddress, tokenMint, amount) {
  const recipient = new PublicKey(recipientAddress);
  const mint = new PublicKey(tokenMint);
  const sender = keypair.publicKey;

  // Get or create recipient's token account
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mint,
    recipient
  );

  // Get sender's token account
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    mint,
    sender
  );

  // Send tokens
  const signature = await transfer(
    connection,
    keypair,
    senderTokenAccount.address,
    recipientTokenAccount.address,
    keypair,
    parseInt(amount) // assumes amount is in smallest unit (lamports for USDC, etc)
  );

  const confirmation = await connection.confirmTransaction(signature);

  return {
    success: true,
    signature,
    amount,
    unit: tokenMint.substring(0, 8) + '...',
    recipient: recipientAddress,
    confirmation,
  };
}

/**
 * Main CLI interface
 */
async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    if (command === 'send-sol') {
      const [recipient, amount] = args;
      if (!recipient || !amount) {
        console.error('Usage: node index.js send-sol <recipient-address> <lamports>');
        process.exit(1);
      }
      const result = await sendSOL(recipient, amount);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === 'send-token') {
      const [recipient, tokenMint, amount] = args;
      if (!recipient || !tokenMint || !amount) {
        console.error(
          'Usage: node index.js send-token <recipient-address> <token-mint> <amount>'
        );
        process.exit(1);
      }
      const result = await sendSPLToken(recipient, tokenMint, amount);
      console.log(JSON.stringify(result, null, 2));
    } else if (command === 'balance') {
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(JSON.stringify({
        wallet: keypair.publicKey.toString(),
        lamports: balance,
        sol: (balance / 1e9).toFixed(9),
      }, null, 2));
    } else if (command === 'address') {
      console.log(keypair.publicKey.toString());
    } else {
      console.log(`Solana Transfer Skill

Commands:
  send-sol <recipient> <lamports>         Send native SOL
  send-token <recipient> <mint> <amount>  Send SPL token
  balance                                  Check wallet balance
  address                                  Show wallet address

Config: ${CONFIG_PATH}
Keypair: ${KEYPAIR_PATH}
Network: ${config.network}
RPC: ${config.rpc}
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

export { connection, keypair,sendSOL, sendSPLToken };
