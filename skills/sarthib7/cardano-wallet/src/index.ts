/**
 * Cardano Wallet Skill for OpenClaw
 *
 * Generate, manage, and fund Cardano wallets
 *
 * @packageDocumentation
 */

// Wallet utilities
export {
  createWalletInstance,
  type GeneratedWallet,
  generateWallet,
  restoreWallet,
  validateMnemonic,
} from './utils/wallet-generator'

// Credential storage
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

// Encryption utilities
export { decrypt, encrypt, generateEncryptionKey, isEncryptionKeySecure } from './utils/encryption'

// QR code generation
export { generateWalletFundingQR, generateWalletFundingQRFile } from './utils/qr-generator'

// Tools
export * from './tools'

// Types
export type { Network } from '../../shared/types/config'
