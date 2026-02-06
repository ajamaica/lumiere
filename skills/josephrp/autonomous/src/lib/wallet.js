/**
 * Wallet state management
 * Handles wallet generation, loading, saving, and client creation.
 * Supports EVM_PRIVATE_KEY env (single wallet) or multi-wallet file with optional network (testnet/mainnet).
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { createWalletClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { getChain } from './chains.js'

const LEGACY_PATH = join(homedir(), '.evm-wallet.json')

function getWalletPath() {
  const envPath = process.env.EVM_WALLET_PATH
  if (envPath) {
    return envPath.startsWith('~') ? join(homedir(), envPath.slice(1)) : envPath
  }
  return join(homedir(), '.evm-wallet.json')
}

function getWalletsPath() {
  const base = process.env.EVM_WALLET_PATH
    ? process.env.EVM_WALLET_PATH.startsWith('~')
      ? join(homedir(), process.env.EVM_WALLET_PATH.slice(1))
      : process.env.EVM_WALLET_PATH
    : join(homedir(), '.evm-wallets.json')
  return base.endsWith('.json') && base.includes('evm-wallet')
    ? base.replace('.evm-wallet.json', '.evm-wallets.json').replace('.evm-wallet', '.evm-wallets')
    : join(homedir(), '.evm-wallets.json')
}

/**
 * Generate a new wallet
 * @returns {Object} Wallet object with address and private key
 */
export function generate() {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  return {
    address: account.address,
    privateKey,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Load default wallet from EVM_PRIVATE_KEY env or state file(s)
 * @returns {Object|null} Wallet object or null if no wallet exists
 */
export function load() {
  try {
    const pk = (process.env.EVM_PRIVATE_KEY || '').trim()
    if (pk) {
      const normalizedPk = pk.startsWith('0x') ? pk : `0x${pk}`
      const account = privateKeyToAccount(normalizedPk)
      return {
        address: account.address,
        privateKey: normalizedPk,
        createdAt: new Date().toISOString(),
      }
    }
    const multi = loadAll()
    if (!multi.wallets.length) return null
    const idx = Math.min(multi.defaultIndex ?? 0, multi.wallets.length - 1)
    return multi.wallets[idx]
  } catch (error) {
    throw new Error(`Failed to load wallet: ${error.message}`)
  }
}

/**
 * @returns {{ wallets: Array<{ address: string, privateKey: string, network?: string, createdAt?: string }>, defaultIndex: number }}
 */
export function loadAll() {
  try {
    const pk = (process.env.EVM_PRIVATE_KEY || '').trim()
    if (pk) {
      const normalizedPk = pk.startsWith('0x') ? pk : `0x${pk}`
      const account = privateKeyToAccount(normalizedPk)
      return {
        wallets: [
          {
            address: account.address,
            privateKey: normalizedPk,
            createdAt: new Date().toISOString(),
          },
        ],
        defaultIndex: 0,
      }
    }
    const walletsPath = getWalletsPath()
    if (existsSync(walletsPath)) {
      const data = readFileSync(walletsPath, 'utf8')
      const parsed = JSON.parse(data)
      const wallets = Array.isArray(parsed.wallets) ? parsed.wallets : []
      const defaultIndex = typeof parsed.defaultIndex === 'number' ? parsed.defaultIndex : 0
      return { wallets, defaultIndex }
    }
    const legacyPath = getWalletPath()
    if (existsSync(legacyPath)) {
      const data = readFileSync(legacyPath, 'utf8')
      const wallet = JSON.parse(data)
      if (wallet.privateKey && wallet.address) {
        const migrated = {
          wallets: [{ ...wallet, createdAt: wallet.createdAt || new Date().toISOString() }],
          defaultIndex: 0,
        }
        saveAll(migrated)
        return migrated
      }
    }
    return { wallets: [], defaultIndex: 0 }
  } catch (e) {
    throw new Error(`Failed to load EVM wallets: ${e.message}`)
  }
}

/**
 * @param {{ wallets: Array, defaultIndex: number }} data
 */
export function saveAll(data) {
  try {
    if ((process.env.EVM_PRIVATE_KEY || '').trim()) return
    const out = {
      wallets: (data.wallets || []).map((w) => ({
        ...w,
        createdAt: w.createdAt || new Date().toISOString(),
      })),
      defaultIndex: data.defaultIndex ?? 0,
    }
    const path = getWalletsPath()
    writeFileSync(path, JSON.stringify(out, null, 2), 'utf8')
    chmodSync(path, 0o600)
  } catch (e) {
    throw new Error(`Failed to save EVM wallets: ${e.message}`)
  }
}

/**
 * Save wallet: add or update. When EVM_PRIVATE_KEY is set, no-op.
 * @param {Object} wallet - Wallet object to save
 * @param {{ setDefault?: boolean }} options
 */
export function save(wallet, options = {}) {
  if ((process.env.EVM_PRIVATE_KEY || '').trim()) return
  const data = loadAll()
  const normalized = { ...wallet, createdAt: wallet.createdAt || new Date().toISOString() }
  const idx = data.wallets.findIndex(
    (w) => (w.address || '').toLowerCase() === (wallet.address || '').toLowerCase(),
  )
  if (idx >= 0) {
    data.wallets[idx] = normalized
  } else {
    data.wallets.push(normalized)
  }
  if (options.setDefault !== false && (data.wallets.length === 1 || options.setDefault === true)) {
    const i = data.wallets.findIndex((w) => w.address === wallet.address)
    data.defaultIndex = i >= 0 ? i : data.wallets.length - 1
  }
  saveAll(data)
}

/**
 * Get viem account from stored wallet (default or by index/address)
 * @param {number|string} [indexOrAddress]
 */
export function getAccount(indexOrAddress) {
  const wallet = indexOrAddress !== undefined ? getWalletAt(indexOrAddress) : load()
  if (!wallet) {
    throw new Error('No wallet found. Run setup.js or create_evm_wallet first.')
  }
  return privateKeyToAccount(wallet.privateKey)
}

/**
 * Get wallet address (default)
 * @returns {string} Wallet address
 */
export function getAddress() {
  const wallet = load()
  if (!wallet) {
    throw new Error('No wallet found. Run setup.js or create_evm_wallet first.')
  }
  return wallet.address
}

/**
 * Get wallet by index or by address. Returns default if no arg.
 * @param {number|string} [indexOrAddress]
 * @returns {Object|null}
 */
export function getWalletAt(indexOrAddress) {
  const data = loadAll()
  if (data.wallets.length === 0) return null
  if (typeof indexOrAddress === 'number') {
    return data.wallets[indexOrAddress] ?? null
  }
  if (typeof indexOrAddress === 'string' && indexOrAddress.trim()) {
    const addr = indexOrAddress.trim().toLowerCase()
    return data.wallets.find((w) => (w.address || '').toLowerCase() === addr) ?? null
  }
  const idx = Math.min(data.defaultIndex ?? 0, data.wallets.length - 1)
  return data.wallets[idx] ?? null
}

/**
 * Create viem wallet client for a specific chain (uses default wallet)
 * @param {string} chainName - Chain name
 * @returns {Object} Viem wallet client
 */
export function getWalletClient(chainName) {
  const chain = getChain(chainName)
  const account = getAccount()
  const viemChain = {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: {
      name: chain.nativeToken.symbol,
      symbol: chain.nativeToken.symbol,
      decimals: chain.nativeToken.decimals,
    },
    rpcUrls: { default: { http: chain.rpcs }, public: { http: chain.rpcs } },
    blockExplorers: { default: { name: chain.explorer.name, url: chain.explorer.url } },
  }
  return createWalletClient({
    account,
    chain: viemChain,
    transport: http(chain.rpcs[0], { retryCount: 3, timeout: 30_000 }),
  })
}

/**
 * Check if wallet exists (EVM_PRIVATE_KEY or wallet file(s))
 * @returns {boolean}
 */
export function exists() {
  if ((process.env.EVM_PRIVATE_KEY || '').trim()) return true
  return existsSync(getWalletsPath()) || existsSync(getWalletPath())
}

/**
 * Get default wallet info (safe - no private key)
 * @returns {Object|null}
 */
export function getWalletInfo() {
  const wallet = load()
  if (!wallet) return null
  return { address: wallet.address, network: wallet.network || null, createdAt: wallet.createdAt }
}

/**
 * Get all wallet infos (no private keys)
 * @returns {Array<{ address: string, network?: string }>}
 */
export function getAllWalletInfos() {
  const data = loadAll()
  return data.wallets.map((w) => ({ address: w.address, network: w.network || null }))
}
