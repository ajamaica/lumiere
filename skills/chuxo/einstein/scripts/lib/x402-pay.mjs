/**
 * x402 Payment Protocol Client
 *
 * Handles the 3-step x402 payment flow:
 *   1. Send request → receive 402 challenge with PAYMENT-REQUIRED header
 *   2. Sign EIP-712 TransferWithAuthorization using private key
 *   3. Re-send request with X-PAYMENT header → receive data
 *
 * Payload uses x402scan format (nested payload.authorization) sent via
 * X-PAYMENT header. The server's V1 middleware verifies via CDP facilitator.
 */

import { privateKeyToAccount } from 'viem/accounts';
import { getAddress, toHex } from 'viem';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Config loading (skill-local config.json → env vars)
// ---------------------------------------------------------------------------

/**
 * Load configuration from config.json or environment variables.
 * Priority: config.json > env vars
 */
export function loadConfig() {
  // 1. Skill-local config
  const localConfig = join(SKILL_ROOT, 'config.json');
  if (existsSync(localConfig)) {
    try {
      const cfg = JSON.parse(readFileSync(localConfig, 'utf-8'));
      return {
        privateKey: cfg.privateKey || process.env.EINSTEIN_X402_PRIVATE_KEY,
        baseUrl: cfg.baseUrl || process.env.EINSTEIN_BASE_URL || 'https://emc2ai.io',
        defaultChain: cfg.defaultChain || process.env.EINSTEIN_DEFAULT_CHAIN || 'base',
      };
    } catch {
      // Fall through to env vars
    }
  }

  // 2. ClawdBot skill config (~/.clawdbot/skills/einstein/config.json)
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const clawdConfig = join(home, '.clawdbot', 'skills', 'einstein', 'config.json');
  if (existsSync(clawdConfig)) {
    try {
      const cfg = JSON.parse(readFileSync(clawdConfig, 'utf-8'));
      return {
        privateKey: cfg.privateKey || process.env.EINSTEIN_X402_PRIVATE_KEY,
        baseUrl: cfg.baseUrl || process.env.EINSTEIN_BASE_URL || 'https://emc2ai.io',
        defaultChain: cfg.defaultChain || process.env.EINSTEIN_DEFAULT_CHAIN || 'base',
      };
    } catch {
      // Fall through to env vars
    }
  }

  // 3. Environment variables
  return {
    privateKey: process.env.EINSTEIN_X402_PRIVATE_KEY,
    baseUrl: process.env.EINSTEIN_BASE_URL || 'https://emc2ai.io',
    defaultChain: process.env.EINSTEIN_DEFAULT_CHAIN || 'base',
  };
}

// ---------------------------------------------------------------------------
// Network → chainId mapping (CDP uses simple names like "base", not CAIP-2)
// ---------------------------------------------------------------------------

const NETWORK_CHAIN_IDS = {
  'base': 8453,
  'base-sepolia': 84532,
  'ethereum': 1,
  'eth': 1,
  'sepolia': 11155111,
  'polygon': 137,
  'arbitrum': 42161,
  'optimism': 10,
  'bsc': 56,
  'zksync': 324,
};

function networkToChainId(network) {
  // CAIP-2 format: "eip155:8453" → 8453
  if (network && network.includes(':')) {
    const id = parseInt(network.split(':')[1], 10);
    if (!isNaN(id)) return id;
  }
  // CDP simple name: "base" → 8453
  return NETWORK_CHAIN_IDS[network] || 8453; // Default to Base
}

// ---------------------------------------------------------------------------
// EIP-712 typed data for TransferWithAuthorization (EIP-3009)
// Matches @x402/evm ExactEvmScheme.signAuthorization() exactly
// ---------------------------------------------------------------------------

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

function createNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

// ---------------------------------------------------------------------------
// Payment header encoding (standard base64, matches @x402/core safeBase64Encode)
// ---------------------------------------------------------------------------

function encodePaymentSignatureHeader(payload) {
  const json = JSON.stringify(payload);
  // Use TextEncoder → btoa for browser compat, fall back to Buffer
  if (typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(json);
    const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return globalThis.btoa(binaryString);
  }
  return Buffer.from(json, 'utf-8').toString('base64');
}

function decodePaymentRequiredHeader(headerValue) {
  if (!headerValue) return null;
  try {
    const decoded = typeof globalThis.atob === 'function'
      ? (() => {
          const bin = globalThis.atob(headerValue);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new TextDecoder('utf-8').decode(bytes);
        })()
      : Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    try { return JSON.parse(headerValue); } catch { return null; }
  }
}

// ---------------------------------------------------------------------------
// Main x402 payment flow
// ---------------------------------------------------------------------------

/**
 * Execute an x402-protected request with automatic payment.
 *
 * Produces a payment payload identical to @x402/evm ExactEvmScheme.createPaymentPayload()
 * so the server's x402HTTPResourceServer can verify and settle it.
 *
 * @param {string} url        Full endpoint URL
 * @param {object} body       Request body (JSON)
 * @param {string} privateKey Hex private key (0x-prefixed)
 * @param {object} [opts]     Optional overrides
 * @param {boolean} [opts.raw] If true, append /raw to URL for data-only response
 * @returns {Promise<{data: any, receipt: string|null, paid: string}>}
 */
export async function x402Fetch(url, body, privateKey, opts = {}) {
  if (!privateKey) {
    throw new Error('Private key required. Run: node scripts/einstein-setup.mjs');
  }

  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(key);
  const targetUrl = opts.raw ? `${url}/raw` : url;

  // ----------------------------------------------------------
  // Step 1: Send request without payment → expect 402 challenge
  // ----------------------------------------------------------
  const headers = { 'Content-Type': 'application/json' };
  const challengeRes = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (challengeRes.ok) {
    const data = await challengeRes.json();
    return { data, receipt: null, paid: '0' };
  }

  if (challengeRes.status !== 402) {
    const errText = await challengeRes.text().catch(() => 'Unknown error');
    throw new Error(`Unexpected status ${challengeRes.status}: ${errText}`);
  }

  // Parse 402 challenge — try PAYMENT-REQUIRED header, fall back to body
  let challenge;
  const prHeader = challengeRes.headers.get('payment-required');
  if (prHeader) {
    challenge = decodePaymentRequiredHeader(prHeader);
  }
  if (!challenge) {
    try { challenge = await challengeRes.json(); }
    catch { throw new Error('Could not parse 402 payment challenge'); }
  }

  const accepts = challenge.accepts;
  if (!accepts || accepts.length === 0) {
    throw new Error('402 challenge has no accepted payment schemes');
  }

  const requirement = accepts.find((a) => a.scheme === 'exact') || accepts[0];

  // ----------------------------------------------------------
  // Step 2: Sign EIP-712 TransferWithAuthorization
  //
  // Mirrors @x402/evm ExactEvmScheme.createPaymentPayload() exactly:
  //   - requirement.maxAmountRequired is ALREADY in atomic units
  //   - requirement.asset is the USDC contract address (verifyingContract)
  //   - requirement.network may be CDP format ("base") or CAIP-2 ("eip155:8453")
  //   - requirement.extra.{name,version} provides EIP-712 domain params
  // ----------------------------------------------------------
  const nonce = createNonce();
  const now = Math.floor(Date.now() / 1000);

  // Amount is already in atomic units (e.g., "250000" = $0.25 USDC)
  const amount = requirement.maxAmountRequired || requirement.amount || '0';

  const authorization = {
    from: account.address,
    to: getAddress(requirement.payTo),
    value: amount,
    validAfter: (now - 600).toString(),    // 10 minutes before (matches SDK)
    validBefore: (now + (requirement.maxTimeoutSeconds || 3600)).toString(),
    nonce,
  };

  // Derive EIP-712 domain from requirement fields
  const chainId = networkToChainId(requirement.network);
  const verifyingContract = getAddress(requirement.asset);

  if (!requirement.extra?.name || !requirement.extra?.version) {
    throw new Error('Payment requirement missing extra.name/version for EIP-712 domain');
  }

  const domain = {
    name: requirement.extra.name,
    version: requirement.extra.version,
    chainId,
    verifyingContract,
  };

  const message = {
    from: getAddress(authorization.from),
    to: getAddress(authorization.to),
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  };

  const signature = await account.signTypedData({
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message,
  });

  // Build payload in x402scan format (nested payload.authorization).
  // The V1 middleware (X402ProviderMiddleware.toCdpPaymentPayload) detects this
  // format via `nestedPayload?.authorization` check and converts it to CDP format.
  // Top-level `network` is required by toCdpNetwork() for CDP facilitator routing.
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: requirement.network,
    asset: verifyingContract,
    amount: amount,
    payload: {
      authorization,
      signature,
    },
  };

  const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

  // ----------------------------------------------------------
  // Step 3: Re-send request with payment header
  // Send X-PAYMENT (V1) which reliably passes through CDN/proxy layers.
  // The V1 middleware (X402ProviderMiddleware) checks X-PAYMENT header,
  // decodes base64, and verifies via the CDP facilitator.
  // ----------------------------------------------------------
  const paidRes = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'X-PAYMENT': paymentHeader,
    },
    body: JSON.stringify(body),
  });

  if (!paidRes.ok) {
    const errText = await paidRes.text().catch(() => 'Unknown error');
    throw new Error(`Payment rejected (${paidRes.status}): ${errText}`);
  }

  const data = await paidRes.json();
  const receipt =
    paidRes.headers.get('payment-response') ||
    paidRes.headers.get('x-payment-response') ||
    null;

  // Convert atomic units back to human-readable for display
  const paidUsd = (parseInt(amount, 10) / 1e6).toFixed(2);

  return { data, receipt, paid: paidUsd };
}

export default { x402Fetch, loadConfig };
