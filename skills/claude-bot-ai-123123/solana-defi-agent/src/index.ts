/**
 * @openclaw/solana-blinks
 * Production-ready Solana Blinks SDK
 *
 * Uses direct Solana Actions specification:
 * - GET to action URL → metadata + available actions
 * - POST with account → transaction to sign
 */

// Types
export * from './types/index.js'

// Core Libraries - Actions (NEW - direct Solana Actions integration)
export {
  ActionError,
  ActionsClient,
  createActionsClient,
  getAction,
  postAction,
  PROTOCOL_ACTIONS,
  TRUSTED_HOSTS,
} from './lib/actions.js'

// Core Libraries - Blinks Executor
export { BlinksExecutor, createBlinksExecutor, parseBlinkUrl } from './lib/blinks.js'

// Core Libraries - Wallet
export { getWalletBalance, getWalletTokenBalances, Wallet } from './lib/wallet.js'

// Core Libraries - Connection
export {
  checkConnection,
  createConnection,
  getConnection,
  getCurrentSlot,
  getNetworkConnection,
  getRecentBlockhash,
} from './lib/connection.js'

// Protocol Handlers
export {
  createProtocolHandlers,
  DriftHandler,
  JitoHandler,
  JupiterHandler,
  KaminoHandler,
  LuloHandler,
  MarginFiHandler,
  PROTOCOL_ACTION_ENDPOINTS,
  ProtocolHandler,
  PROTOCOLS,
  SanctumHandler,
} from './lib/protocols.js'

// Output Utilities
export {
  error,
  formatAddress,
  formatNumber,
  formatOutput,
  formatPercent,
  formatSignature,
  formatTokenAmount,
  formatUsd,
  info,
  success,
  warn,
} from './lib/output.js'

// Convenience re-exports
export { Connection, Keypair, PublicKey } from '@solana/web3.js'

// Registry - Fetch trusted hosts from Dialect registry
export {
  clearRegistryCache,
  fetchRegistry,
  getMaliciousHosts,
  getProtocolHosts,
  getRegistryStats,
  getTrustedHosts,
  isHostMalicious,
  isHostTrusted,
} from './lib/registry.js'

// Markets API - Dialect Standard Blinks Library
export {
  createMarketsClient,
  type DialectMarket,
  type DialectPosition,
  findBestYield,
  getMarkets,
  getPositions,
  MarketsClient,
} from './lib/markets.js'

// Legacy export for backward compatibility (deprecated)
export { ActionsClient as DialectClient } from './lib/actions.js'
