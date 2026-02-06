#!/usr/bin/env node

/**
 * Agent Payment Protocol
 * 
 * Orchestrates agent-to-agent payments in IRC channels.
 * Enables expert agents to quote work in #channels and receive payment via Solana.
 * 
 * Flow:
 * 1. Cheap agent asks: "@expert, <question>"
 * 2. Expert responds: "Quote: 0.001 SOL [quote_id:xyz]"
 * 3. Cheap agent approves and pays via Solana
 * 4. Both agents log transaction for audit trail
 */

import { randomBytes } from 'crypto';
import { existsSync,readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUOTES_DB = join(__dirname, 'quotes.jsonl');
const PAYMENTS_DB = join(__dirname, 'payments.jsonl');

/**
 * Generate a unique quote ID
 */
function generateQuoteId() {
  return `q_${randomBytes(8).toString('hex')}`;
}

/**
 * Expert agent: Create and publish a quote
 * 
 * @param {object} params
 *   - from: agent name/wallet
 *   - to: expert name/wallet
 *   - channel: IRC channel (#lobby, etc)
 *   - question: the query being answered
 *   - answer: the response/solution
 *   - price: amount in SOL (e.g., 0.001)
 * 
 * @returns {object} quote object with ID and IRC-friendly format
 */
export function createQuote({
  from,
  to,
  channel,
  question,
  answer,
  price,
}) {
  const quoteId = generateQuoteId();
  const timestamp = new Date().toISOString();

  const quote = {
    id: quoteId,
    from,
    to,
    channel,
    question,
    answer,
    price, // in SOL
    status: 'pending',
    created_at: timestamp,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
  };

  // Append to local ledger
  writeFileSync(QUOTES_DB, JSON.stringify(quote) + '\n', { flag: 'a' });

  // Return IRC-friendly format
  return {
    quote_id: quoteId,
    message: `Quote: ${price} SOL [${quoteId}] — Use: /pay ${quoteId}`,
    quote,
  };
}

/**
 * Cheap agent: Approve and prepare payment
 * 
 * @param {object} params
 *   - quote_id: the quote to pay
 *   - from_wallet: payer's Solana address
 *   - to_wallet: recipient's Solana address
 * 
 * @returns {object} payment authorization ready for Solana skill
 */
export function approvePayment({
  quote_id,
  from_wallet,
  to_wallet,
  amount_lamports, // If manual override
}) {
  // Read quote
  const quotes = readFileSync(QUOTES_DB, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));

  const quote = quotes.find(q => q.id === quote_id);
  if (!quote) throw new Error(`Quote ${quote_id} not found`);
  if (quote.status !== 'pending') throw new Error(`Quote ${quote_id} already ${quote.status}`);

  // Convert SOL price to lamports (1 SOL = 1e9 lamports)
  const lamports = amount_lamports || Math.round(quote.price * 1e9);

  const payment = {
    id: `p_${randomBytes(8).toString('hex')}`,
    quote_id,
    from_wallet,
    to_wallet,
    amount_lamports: lamports,
    amount_sol: (lamports / 1e9).toFixed(9),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  // Mark quote as accepted
  quote.status = 'accepted';
  quote.accepted_at = new Date().toISOString();

  // Write updated quotes and new payment
  const updatedQuotes = quotes.map(q => (q.id === quote_id ? quote : q));
  writeFileSync(
    QUOTES_DB,
    updatedQuotes.map(q => JSON.stringify(q)).join('\n') + '\n'
  );
  writeFileSync(PAYMENTS_DB, JSON.stringify(payment) + '\n', { flag: 'a' });

  return payment;
}

/**
 * After Solana transaction: Record successful payment
 * 
 * @param {object} params
 *   - payment_id: internal payment ID
 *   - tx_hash: Solana transaction signature
 *   - confirmed: boolean (was it confirmed on-chain?)
 */
export function recordPayment({
  payment_id,
  tx_hash,
  confirmed = true,
}) {
  // Read payments
  const payments = readFileSync(PAYMENTS_DB, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));

  const payment = payments.find(p => p.id === payment_id);
  if (!payment) throw new Error(`Payment ${payment_id} not found`);

  payment.status = confirmed ? 'confirmed' : 'pending';
  payment.tx_hash = tx_hash;
  payment.confirmed_at = new Date().toISOString();

  // Update quotes with settled status
  const quotes = readFileSync(QUOTES_DB, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));

  const quote = quotes.find(q => q.id === payment.quote_id);
  if (quote) {
    quote.status = 'settled';
    quote.settled_at = new Date().toISOString();
  }

  // Write back
  const updatedPayments = payments.map(p => (p.id === payment_id ? payment : p));
  writeFileSync(
    PAYMENTS_DB,
    updatedPayments.map(p => JSON.stringify(p)).join('\n') + '\n'
  );

  if (quote) {
    const updatedQuotes = quotes.map(q => (q.id === quote.id ? quote : q));
    writeFileSync(
      QUOTES_DB,
      updatedQuotes.map(q => JSON.stringify(q)).join('\n') + '\n'
    );
  }

  return payment;
}

/**
 * Get quote details
 */
export function getQuote(quote_id) {
  if (!existsSync(QUOTES_DB)) return null;
  const quotes = readFileSync(QUOTES_DB, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  return quotes.find(q => q.id === quote_id);
}

/**
 * Get all payments for an agent
 */
export function getPaymentHistory(agent_wallet) {
  if (!existsSync(PAYMENTS_DB)) return [];
  const payments = readFileSync(PAYMENTS_DB, 'utf8')
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
  return payments.filter(
    p => p.from_wallet === agent_wallet || p.to_wallet === agent_wallet
  );
}

/**
 * Get quote statistics
 */
export function getStats() {
  const quoteFile = existsSync(QUOTES_DB) ? readFileSync(QUOTES_DB, 'utf8') : '';
  const paymentFile = existsSync(PAYMENTS_DB) ? readFileSync(PAYMENTS_DB, 'utf8') : '';

  const quotes = quoteFile.trim() ? quoteFile.split('\n').map(l => JSON.parse(l)) : [];
  const payments = paymentFile.trim() ? paymentFile.split('\n').map(l => JSON.parse(l)) : [];

  return {
    total_quotes: quotes.length,
    quotes_settled: quotes.filter(q => q.status === 'settled').length,
    total_payments: payments.length,
    payments_confirmed: payments.filter(p => p.status === 'confirmed').length,
    total_volume_sol: payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + parseFloat(p.amount_sol), 0)
      .toFixed(9),
  };
}

/**
 * CLI
 */
async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'quote': {
      // Create a test quote
      const result = createQuote({
        from: args[0] || 'cheap-agent',
        to: args[1] || 'expert-agent',
        channel: '#lobby',
        question: 'What is 2+2?',
        answer: '4',
        price: 0.001,
      });
      console.log(result.message);
      console.log(JSON.stringify(result.quote, null, 2));
      break;
    }

    case 'approve': {
      // Approve a payment
      const result = approvePayment({
        quote_id: args[0],
        from_wallet: args[1],
        to_wallet: args[2],
      });
      console.log(`Payment approved: ${result.id}`);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'confirm': {
      // Record a payment on-chain
      const result = recordPayment({
        payment_id: args[0],
        tx_hash: args[1],
        confirmed: true,
      });
      console.log(`Payment confirmed: ${result.tx_hash}`);
      break;
    }

    case 'quote-get': {
      const q = getQuote(args[0]);
      console.log(JSON.stringify(q, null, 2));
      break;
    }

    case 'history': {
      const history = getPaymentHistory(args[0]);
      console.log(JSON.stringify(history, null, 2));
      break;
    }

    case 'stats': {
      const stats = getStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    default:
      console.log(`Agent Payment Protocol

Commands:
  quote <from> <to>                        Create a quote
  approve <quote_id> <from_wallet> <to>    Approve a payment
  confirm <payment_id> <tx_hash>           Record on-chain payment
  quote-get <quote_id>                     Get quote details
  history <wallet_address>                 View agent payment history
  stats                                    View protocol statistics
`);
  }
}

main().catch(console.error);
