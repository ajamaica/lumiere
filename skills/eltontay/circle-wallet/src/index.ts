/**
 * Circle Wallet Skill - Main Export
 * Reusable USDC wallet functionality for OpenClaw agents
 */

export type { ChainInfo } from './chains'
export {
  getChainInfo,
  getMainnetChains,
  getTestnetChains,
  getUSDCTokenId,
  isValidChain,
  SUPPORTED_CHAINS,
} from './chains'
export { configExists, ensureConfigDir, loadConfig, saveConfig } from './config'
export { generateEntitySecret, registerEntitySecret } from './entity'
export {
  formatUSDCBalance,
  isValidEthereumAddress,
  resolveWalletId,
  validateUSDCAmount,
} from './utils'
export type { WalletConfig } from './wallet'
export { CircleWallet } from './wallet'
