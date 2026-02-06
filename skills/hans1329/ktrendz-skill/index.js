/**
 * K-Trendz Lightstick Trading Skill (V2)
 *
 * This skill enables trading of K-pop artist lightstick tokens
 * on the K-Trendz bonding curve market.
 *
 * V2 features:
 * - Paymaster gas sponsorship (no ETH needed)
 * - Per-agent DAU tracking on-chain
 * - Circuit breaker protection
 *
 * All trading operations are proxied through the K-Trendz API.
 * See SKILL.md for complete documentation.
 */

module.exports = {
  name: 'ktrendz-lightstick-trading',
  version: '1.3.0',
  description:
    'Trade K-pop artist lightstick tokens on the K-Trendz bonding curve market (V2 with Paymaster)',

  commands: {
    setup: './scripts/setup.sh',
    tokens: './scripts/tokens.sh',
    price: './scripts/price.sh',
    buy: './scripts/buy.sh',
    sell: './scripts/sell.sh',
  },

  contract: {
    address: '0x28bE702CC3A611A1EB875E277510a74fD20CDD9C',
    network: 'base-mainnet',
    chainId: 8453,
    standard: 'ERC-1155',
  },

  baseUrl: 'https://k-trendz.com/api/bot/',

  requiredEnv: ['KTRENDZ_API_KEY'],
  optionalEnv: [],
}
