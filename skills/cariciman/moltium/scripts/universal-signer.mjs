/**
 * Moltium universal signer (reference)
 *
 * Purpose: given unsignedTxBase64 from Moltium builder endpoints, sign LOCALLY and return signedTxBase64.
 * Supports both VersionedTransaction (v0) and legacy Transaction.
 *
 * NOTE: This is a reference helper for an agent runtime. It does not manage secrets.
 */

import { Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * @param {string} unsignedTxBase64
 * @param {Array<import('@solana/web3.js').Signer>} signers - must include ALL required local signers
 * @returns {string} signedTxBase64
 */
export function signUnsignedTxBase64(unsignedTxBase64, signers) {
  const bytes = Buffer.from(unsignedTxBase64, 'base64');

  // Try versioned first
  try {
    const vtx = VersionedTransaction.deserialize(bytes);
    vtx.sign(signers);
    return Buffer.from(vtx.serialize()).toString('base64');
  } catch {
    // Fall through to legacy
  }

  const ltx = Transaction.from(bytes);
  ltx.partialSign(...signers);
  return Buffer.from(ltx.serialize()).toString('base64');
}
