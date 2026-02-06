import { MeshWallet, resolvePaymentKeyHash } from '@meshsdk/core'

import { Network } from '../../../shared/types/config'

/**
 * Generated wallet credentials
 */
export interface GeneratedWallet {
  mnemonic: string // 24-word mnemonic phrase (space-separated)
  mnemonicWords: string[] // Mnemonic as array of words
  address: string // Cardano address (addr1...)
  vkey: string // Payment verification key (wallet vkey)
  network: Network // Preprod or Mainnet
}

/**
 * Convert network string to Cardano network ID
 */
function networkToId(network: Network): 0 | 1 {
  return network === 'Mainnet' ? 1 : 0
}

/**
 * Generate a new Cardano wallet
 *
 * This function follows the exact pattern used by Masumi Payment Service:
 * 1. Generate 24-word mnemonic using MeshWallet.brew()
 * 2. Create offline wallet (no blockchain connection needed)
 * 3. Derive first unused address
 * 4. Extract payment verification key (vkey)
 *
 * @param network - 'Preprod' or 'Mainnet'
 * @returns GeneratedWallet with mnemonic, address, and vkey
 *
 * @example
 * ```typescript
 * const wallet = await generateWallet('Preprod');
 * console.log('Address:', wallet.address);
 * console.log('VKey:', wallet.vkey);
 * console.log('Mnemonic:', wallet.mnemonic);
 * // IMPORTANT: Backup the mnemonic securely!
 * ```
 */
export async function generateWallet(network: Network): Promise<GeneratedWallet> {
  // Step 1: Generate 24-word mnemonic
  // MeshWallet.brew(false) = 24 words, brew(true) = 12 words
  const secretKey = MeshWallet.brew(false)
  const mnemonicWords = typeof secretKey === 'string' ? secretKey.split(' ') : secretKey
  const mnemonic = mnemonicWords.join(' ')

  // Step 2: Create offline wallet (no fetcher/submitter = offline mode)
  const meshWallet = new MeshWallet({
    networkId: networkToId(network),
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  })

  // Step 3: Derive address (first unused address from HD derivation)
  const addresses = await meshWallet.getUnusedAddresses()
  const address = addresses[0]

  if (!address) {
    throw new Error('Failed to derive wallet address from mnemonic')
  }

  // Step 4: Extract payment verification key
  const vkey = resolvePaymentKeyHash(address)

  return {
    mnemonic,
    mnemonicWords,
    address,
    vkey,
    network,
  }
}

/**
 * Restore wallet from existing mnemonic
 *
 * @param mnemonic - 24-word mnemonic phrase (space-separated or array)
 * @param network - 'Preprod' or 'Mainnet'
 * @returns GeneratedWallet with address and vkey derived from mnemonic
 *
 * @example
 * ```typescript
 * const wallet = await restoreWallet('word1 word2 ... word24', 'Preprod');
 * console.log('Restored address:', wallet.address);
 * ```
 */
export async function restoreWallet(
  mnemonic: string | string[],
  network: Network,
): Promise<GeneratedWallet> {
  const mnemonicWords = typeof mnemonic === 'string' ? mnemonic.split(' ') : mnemonic
  const mnemonicString = mnemonicWords.join(' ')

  // Validate mnemonic word count
  if (mnemonicWords.length !== 24 && mnemonicWords.length !== 12 && mnemonicWords.length !== 15) {
    throw new Error(`Invalid mnemonic: expected 12, 15, or 24 words, got ${mnemonicWords.length}`)
  }

  // Create wallet from mnemonic
  const meshWallet = new MeshWallet({
    networkId: networkToId(network),
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  })

  // Derive address and vkey
  const addresses = await meshWallet.getUnusedAddresses()
  const address = addresses[0]

  if (!address) {
    throw new Error('Failed to derive wallet address from mnemonic')
  }

  const vkey = resolvePaymentKeyHash(address)

  return {
    mnemonic: mnemonicString,
    mnemonicWords,
    address,
    vkey,
    network,
  }
}

/**
 * Create a MeshWallet instance from mnemonic for transactions
 *
 * @param mnemonic - 24-word mnemonic phrase
 * @param network - 'Preprod' or 'Mainnet'
 * @param blockfrostApiKey - Blockfrost API key for blockchain interaction
 * @returns Configured MeshWallet instance
 *
 * @example
 * ```typescript
 * const wallet = createWalletInstance(
 *   'word1 word2 ...',
 *   'Preprod',
 *   'preprodXXX...'
 * );
 * const balance = await wallet.getBalance();
 * ```
 */
export function createWalletInstance(
  mnemonic: string | string[],
  network: Network,
  blockfrostApiKey?: string,
): MeshWallet {
  const mnemonicWords = typeof mnemonic === 'string' ? mnemonic.split(' ') : mnemonic
  const networkId = networkToId(network)

  const walletConfig: any = {
    networkId,
    key: {
      type: 'mnemonic',
      words: mnemonicWords,
    },
  }

  // If Blockfrost API key provided, enable blockchain interaction
  if (blockfrostApiKey) {
    const { BlockfrostProvider } = require('@meshsdk/core')
    const provider = new BlockfrostProvider(blockfrostApiKey)

    walletConfig.fetcher = provider
    walletConfig.submitter = provider
  }

  return new MeshWallet(walletConfig)
}

/**
 * Validate a mnemonic phrase
 *
 * @param mnemonic - Mnemonic to validate
 * @returns true if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string | string[]): boolean {
  try {
    const words = typeof mnemonic === 'string' ? mnemonic.split(' ') : mnemonic

    // Check word count
    if (![12, 15, 24].includes(words.length)) {
      return false
    }

    // Check all words are non-empty
    if (words.some((word) => !word || word.trim().length === 0)) {
      return false
    }

    // Try to create a wallet (will throw if invalid)
    new MeshWallet({
      networkId: 0,
      key: {
        type: 'mnemonic',
        words,
      },
    })

    return true
  } catch {
    return false
  }
}
