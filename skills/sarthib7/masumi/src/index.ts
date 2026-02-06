/**
 * Masumi Payments Skill for OpenClaw
 *
 * Install payment service, generate API keys, register agents, handle payments
 *
 * @packageDocumentation
 */

// Managers
export { PaymentManager } from './managers/payment'
export { RegistryManager } from './managers/registry'

// Services
export { AutoProvisionService } from './services/auto-provision'
export {
  checkPaymentServiceStatus,
  generateApiKey,
  installPaymentService,
  type InstallPaymentServiceOptions,
  type PaymentServiceInstallResult,
  type PaymentServiceStatus,
  startPaymentService,
} from './services/payment-service-installer'

// Utilities
export { ApiClient, ApiError, withRetry } from './utils/api-client'
export {
  credentialsExist,
  deleteCredentials,
  exportCredentials,
  importCredentials,
  listAllCredentials,
  loadCredentials,
  saveCredentials,
  type StoredCredentials,
  updateCredentials,
} from './utils/credential-store'
export { decrypt, encrypt, generateEncryptionKey, isEncryptionKeySecure } from './utils/encryption'
export {
  createMasumiInputHash,
  createMasumiOutputHash,
  generateRandomIdentifier,
} from './utils/hashing'
export {
  createWalletInstance,
  type GeneratedWallet,
  generateWallet,
  restoreWallet,
  validateMnemonic,
} from './utils/wallet-generator'

// Tools
export * from './tools'

// Types
export type {
  AutoProvisionParams,
  MasumiPluginConfig,
  Network,
  PricingTier,
  ProvisionedAgent,
} from '../../shared/types/config'
export type {
  CreatePaymentParams,
  PaymentAction,
  PaymentListResponse,
  PaymentRequest,
  PaymentState,
  PaymentStateChangeEvent,
  WalletBalance,
} from './types/payment'
