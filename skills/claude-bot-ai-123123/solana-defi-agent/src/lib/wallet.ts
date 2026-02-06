/**
 * Wallet Management
 * Load keypairs, check balances, sign transactions
 */

import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import bs58 from 'bs58'
import * as fs from 'fs'
import * as path from 'path'

import type { WalletBalance } from '../types/index.js'

// Common token mints
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  So11111111111111111111111111111111111111112: { symbol: 'SOL', decimals: 9 },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', decimals: 6 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT', decimals: 6 },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: 'mSOL', decimals: 9 },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: { symbol: 'bSOL', decimals: 9 },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: { symbol: 'jitoSOL', decimals: 9 },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', decimals: 9 },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: 'BONK', decimals: 5 },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', decimals: 6 },
  KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS: { symbol: 'KMNO', decimals: 6 },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: { symbol: 'PYTH', decimals: 6 },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: { symbol: 'ORCA', decimals: 6 },
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac: { symbol: 'MNGO', decimals: 6 },
  RAYcYRMxQcHBP7pN6Nh3HLY2QFxQGBMwRvoWcxr4sYr: { symbol: 'RAY', decimals: 6 },
}

/**
 * Wallet class for managing Solana keypairs
 */
export class Wallet {
  private keypair: Keypair

  constructor(keypair: Keypair) {
    this.keypair = keypair
  }

  /**
   * Load wallet from environment variable
   *
   * Priority:
   * 1. SOLANA_WALLET_PATH - path to JSON keypair file (recommended)
   * 2. SOLANA_PRIVATE_KEY - base58 or JSON array (fallback)
   */
  static fromEnv(): Wallet {
    // Prefer file path (more secure - key not in env)
    const walletPath = process.env.SOLANA_WALLET_PATH
    if (walletPath) {
      return Wallet.fromFile(walletPath)
    }

    // Fallback to direct key (backwards compatibility)
    const privateKey = process.env.SOLANA_PRIVATE_KEY
    if (privateKey) {
      return Wallet.fromPrivateKey(privateKey)
    }

    throw new Error(
      'No wallet configured. Set SOLANA_WALLET_PATH (recommended) or SOLANA_PRIVATE_KEY',
    )
  }

  /**
   * Load wallet from private key (base58 or array)
   */
  static fromPrivateKey(privateKey: string): Wallet {
    let keypair: Keypair

    // Try parsing as JSON array first
    if (privateKey.startsWith('[')) {
      try {
        const secretKey = new Uint8Array(JSON.parse(privateKey))
        keypair = Keypair.fromSecretKey(secretKey)
      } catch {
        throw new Error('Invalid private key format (JSON array)')
      }
    } else {
      // Parse as base58
      try {
        const secretKey = bs58.decode(privateKey)
        keypair = Keypair.fromSecretKey(secretKey)
      } catch {
        throw new Error('Invalid private key format (base58)')
      }
    }

    return new Wallet(keypair)
  }

  /**
   * Load wallet from JSON keypair file
   */
  static fromFile(filePath: string): Wallet {
    const resolvedPath = filePath.startsWith('~')
      ? path.join(process.env.HOME || '', filePath.slice(1))
      : filePath

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Wallet file not found: ${resolvedPath}`)
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8')
    const secretKey = new Uint8Array(JSON.parse(content))
    const keypair = Keypair.fromSecretKey(secretKey)

    return new Wallet(keypair)
  }

  /**
   * Get wallet public key
   */
  get publicKey(): PublicKey {
    return this.keypair.publicKey
  }

  /**
   * Get wallet address as string
   */
  get address(): string {
    return this.keypair.publicKey.toBase58()
  }

  /**
   * Sign a transaction (legacy or versioned)
   */
  sign(transaction: Transaction | VersionedTransaction): Transaction | VersionedTransaction {
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([this.keypair])
    } else {
      transaction.partialSign(this.keypair)
    }
    return transaction
  }

  /**
   * Get transaction signer function for use with BlinksExecutor
   */
  getSigner(): (
    tx: Transaction | VersionedTransaction,
  ) => Promise<Transaction | VersionedTransaction> {
    return async (tx) => this.sign(tx)
  }

  /**
   * Get SOL balance
   */
  async getBalance(connection: Connection): Promise<number> {
    const balance = await connection.getBalance(this.publicKey)
    return balance / LAMPORTS_PER_SOL
  }

  /**
   * Get all token balances
   */
  async getAllBalances(connection: Connection): Promise<WalletBalance[]> {
    const balances: WalletBalance[] = []

    // SOL balance
    const solBalance = await connection.getBalance(this.publicKey)
    balances.push({
      token: 'SOL',
      mint: 'So11111111111111111111111111111111111111112',
      balance: solBalance / LAMPORTS_PER_SOL,
      decimals: 9,
    })

    // Token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(this.publicKey, {
      programId: TOKEN_PROGRAM_ID,
    })

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed?.info
      if (!parsedInfo) continue

      const mint = parsedInfo.mint
      const balance = parsedInfo.tokenAmount?.uiAmount ?? 0
      const decimals = parsedInfo.tokenAmount?.decimals ?? 0

      if (balance > 0) {
        const knownToken = KNOWN_TOKENS[mint]
        balances.push({
          token: knownToken?.symbol || mint.slice(0, 8) + '...',
          mint,
          balance,
          decimals,
        })
      }
    }

    return balances
  }

  /**
   * Get balance of a specific token
   */
  async getTokenBalance(connection: Connection, mint: string): Promise<number> {
    const mintPubkey = new PublicKey(mint)
    const ata = await getAssociatedTokenAddress(mintPubkey, this.publicKey)

    try {
      const accountInfo = await connection.getParsedAccountInfo(ata)
      if (!accountInfo.value) return 0

      const parsedData = (accountInfo.value.data as any)?.parsed?.info
      return parsedData?.tokenAmount?.uiAmount ?? 0
    } catch {
      return 0
    }
  }
}

/**
 * Get balance for any wallet address (read-only)
 */
export async function getWalletBalance(connection: Connection, address: string): Promise<number> {
  const pubkey = new PublicKey(address)
  const balance = await connection.getBalance(pubkey)
  return balance / LAMPORTS_PER_SOL
}

/**
 * Get all token balances for any wallet address (read-only)
 */
export async function getWalletTokenBalances(
  connection: Connection,
  address: string,
): Promise<WalletBalance[]> {
  const pubkey = new PublicKey(address)
  const balances: WalletBalance[] = []

  // SOL
  const solBalance = await connection.getBalance(pubkey)
  balances.push({
    token: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    balance: solBalance / LAMPORTS_PER_SOL,
    decimals: 9,
  })

  // Tokens
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  })

  for (const { account } of tokenAccounts.value) {
    const parsedInfo = account.data.parsed?.info
    if (!parsedInfo) continue

    const mint = parsedInfo.mint
    const balance = parsedInfo.tokenAmount?.uiAmount ?? 0
    const decimals = parsedInfo.tokenAmount?.decimals ?? 0

    if (balance > 0) {
      const knownToken = KNOWN_TOKENS[mint]
      balances.push({
        token: knownToken?.symbol || mint.slice(0, 8) + '...',
        mint,
        balance,
        decimals,
      })
    }
  }

  return balances
}

export default Wallet
