/**
 * OpenClaw Tools for Cardano Wallet Skill
 *
 * These tools enable AI agents to generate, manage, and fund Cardano wallets
 */

import type { Network } from '../../../shared/types/config'
import {
  credentialsExist,
  exportCredentials,
  loadCredentials,
  saveCredentials,
  type StoredCredentials,
} from '../utils/credential-store'
import { generateWalletFundingQR } from '../utils/qr-generator'
import {
  type GeneratedWallet,
  generateWallet,
  restoreWallet,
  validateMnemonic,
} from '../utils/wallet-generator'

/**
 * Load network from environment
 */
function getNetwork(): Network {
  return (process.env.CARDANO_NETWORK || 'Preprod') as Network
}

/**
 * Tool: cardano_generate_wallet
 *
 * Generate a new Cardano wallet with 24-word mnemonic
 *
 * @param params - Wallet generation parameters
 * @returns Generated wallet with mnemonic, address, and vkey
 */
export async function cardano_generate_wallet(
  params: {
    network?: Network
  } = {},
) {
  try {
    const network = params.network || getNetwork()
    const wallet = await generateWallet(network)

    // Save credentials securely
    const credentialsPath = await saveCredentials({
      agentIdentifier: `wallet_${Date.now()}`,
      network,
      walletAddress: wallet.address,
      walletVkey: wallet.vkey,
      mnemonic: wallet.mnemonic,
    })

    return {
      success: true,
      address: wallet.address,
      vkey: wallet.vkey,
      network: wallet.network,
      credentialsPath,
      message:
        'Wallet generated successfully! IMPORTANT: Backup your mnemonic securely. It is stored encrypted at the credentials path.',
      warning: 'Never share your mnemonic with anyone. It provides full access to your wallet.',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate wallet',
    }
  }
}

/**
 * Tool: cardano_restore_wallet
 *
 * Restore a wallet from existing mnemonic
 *
 * @param params - Wallet restoration parameters
 * @returns Restored wallet information
 */
export async function cardano_restore_wallet(params: {
  mnemonic: string
  network?: Network
  agentIdentifier?: string
}) {
  try {
    if (!params.mnemonic) {
      return {
        success: false,
        error: 'mnemonic_required',
        message: 'Mnemonic is required to restore wallet',
      }
    }

    // Validate mnemonic
    if (!validateMnemonic(params.mnemonic)) {
      return {
        success: false,
        error: 'invalid_mnemonic',
        message: 'Invalid mnemonic phrase. Please check and try again.',
      }
    }

    const network = params.network || getNetwork()
    const wallet = await restoreWallet(params.mnemonic, network)

    // Save credentials if agent identifier provided
    let credentialsPath: string | undefined
    if (params.agentIdentifier) {
      credentialsPath = await saveCredentials({
        agentIdentifier: params.agentIdentifier,
        network,
        walletAddress: wallet.address,
        walletVkey: wallet.vkey,
        mnemonic: wallet.mnemonic,
      })
    }

    return {
      success: true,
      address: wallet.address,
      vkey: wallet.vkey,
      network: wallet.network,
      credentialsPath,
      message: 'Wallet restored successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to restore wallet',
    }
  }
}

/**
 * Tool: cardano_get_wallet_address
 *
 * Get wallet address from stored credentials
 *
 * @param params - Wallet identifier
 * @returns Wallet address
 */
export async function cardano_get_wallet_address(params: {
  agentIdentifier: string
  network?: Network
}) {
  try {
    const network = params.network || getNetwork()
    const credentials = await loadCredentials(params.agentIdentifier, network)

    return {
      success: true,
      address: credentials.walletAddress,
      network: credentials.network,
      message: 'Wallet address retrieved successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to get wallet address',
    }
  }
}

/**
 * Tool: cardano_generate_funding_qr
 *
 * Generate QR code for wallet funding
 *
 * @param params - QR generation parameters
 * @returns QR code data URL and funding information
 */
export async function cardano_generate_funding_qr(params: {
  address?: string
  agentIdentifier?: string
  network?: Network
}) {
  try {
    const network = params.network || getNetwork()
    let address: string

    if (params.address) {
      address = params.address
    } else if (params.agentIdentifier) {
      const credentials = await loadCredentials(params.agentIdentifier, network)
      address = credentials.walletAddress
    } else {
      return {
        success: false,
        error: 'address_or_identifier_required',
        message: 'Either address or agentIdentifier must be provided',
      }
    }

    const qrResult = await generateWalletFundingQR(address, network)

    return {
      success: true,
      qrDataUrl: qrResult.qrDataUrl,
      address: qrResult.address,
      network: qrResult.network,
      faucetUrl: qrResult.faucetUrl,
      message: qrResult.message,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate QR code',
    }
  }
}

/**
 * Tool: cardano_get_wallet_balance
 *
 * Get wallet balance (requires Blockfrost API key)
 *
 * @param params - Balance check parameters
 * @returns Wallet balance in ADA and lovelace
 */
export async function cardano_get_wallet_balance(params: {
  agentIdentifier: string
  network?: Network
  blockfrostApiKey?: string
}) {
  try {
    const network = params.network || getNetwork()
    const blockfrostApiKey =
      params.blockfrostApiKey ||
      process.env.BLOCKFROST_API_KEY ||
      (network === 'Preprod'
        ? process.env.BLOCKFROST_PREPROD_API_KEY
        : process.env.BLOCKFROST_MAINNET_API_KEY)

    if (!blockfrostApiKey) {
      return {
        success: false,
        error: 'blockfrost_api_key_required',
        message:
          'Blockfrost API key is required. Set BLOCKFROST_API_KEY or BLOCKFROST_PREPROD_API_KEY / BLOCKFROST_MAINNET_API_KEY environment variable.',
      }
    }

    const credentials = await loadCredentials(params.agentIdentifier, network)
    const { createWalletInstance } = await import('../utils/wallet-generator')
    const wallet = createWalletInstance(credentials.mnemonic, network, blockfrostApiKey)

    const balance = await wallet.getBalance()

    return {
      success: true,
      ada: balance / 1_000_000, // Convert lovelace to ADA
      lovelace: balance.toString(),
      network,
      address: credentials.walletAddress,
      message: 'Balance retrieved successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to get wallet balance',
    }
  }
}

/**
 * Tool: cardano_backup_wallet
 *
 * Securely backup wallet credentials
 *
 * @param params - Backup parameters
 * @returns Backup data (encrypted)
 */
export async function cardano_backup_wallet(params: {
  agentIdentifier: string
  network?: Network
}) {
  try {
    const network = params.network || getNetwork()
    const backupData = await exportCredentials(params.agentIdentifier, network)

    return {
      success: true,
      backupData,
      agentIdentifier: params.agentIdentifier,
      network,
      message: 'Wallet backup created. Store this securely. It contains encrypted credentials.',
      warning: 'Keep this backup safe. It can be used to restore your wallet.',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to backup wallet',
    }
  }
}

/**
 * Export all Cardano Wallet tools
 */
export const CardanoWalletTools = {
  cardano_generate_wallet,
  cardano_restore_wallet,
  cardano_get_wallet_address,
  cardano_generate_funding_qr,
  cardano_get_wallet_balance,
  cardano_backup_wallet,
}

export default CardanoWalletTools
