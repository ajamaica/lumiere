/**
 * x402 payment requirement and 402 response types.
 * Used for parsing 402 Payment Required and building payment payloads.
 */

/** @typedef {Object} PaymentRequirements
 * @property {string} scheme - e.g. "exact"
 * @property {string} network - e.g. "aptos:2", "eip155:84532"
 * @property {string|number} amount - atomic units
 * @property {string} asset - asset type or contract address
 * @property {string} payTo - recipient address
 * @property {string} [resource] - resource path
 * @property {string} [description] - human-readable description
 */

/** @typedef {Object} Payment402Body
 * @property {PaymentRequirements|PaymentRequirements[]} paymentRequirements
 * @property {string} [invalidReason] - e.g. "insufficient_funds"
 * @property {string} [onramp_url]
 */

/** Network constants: which tool uses which.
 * - aptos:2, aptos:1: prediction, backtest (Aptos testnet/mainnet)
 * - eip155:8453, eip155:84532: open_bank_account (Base, Base Sepolia)
 */
export const NETWORKS = {
  APTOS_TESTNET: 'aptos:2',
  APTOS_MAINNET: 'aptos:1',
  BASE: 'eip155:8453',
  BASE_SEPOLIA: 'eip155:84532',
}

export function isAptosNetwork(network) {
  return typeof network === 'string' && network.startsWith('aptos:')
}

export function isEvmNetwork(network) {
  return typeof network === 'string' && network.startsWith('eip155:')
}

/**
 * Normalize 402 body to a single PaymentRequirements object.
 * @param {Payment402Body} body - Parsed 402 response body
 * @returns {PaymentRequirements|null}
 */
export function getFirstPaymentRequirements(body) {
  if (!body || !body.paymentRequirements) return null
  const pr = body.paymentRequirements
  return Array.isArray(pr) ? (pr[0] ?? null) : pr
}
