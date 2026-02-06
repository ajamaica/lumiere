/**
 * Aptos wallet state: load/save key file(s), expose address and private key for signing.
 * Supports multiple wallets with optional network (testnet/mainnet).
 * Legacy: ~/.aptos-agent-wallet.json (single). New: ~/.aptos-agent-wallets.json (multi, defaultIndex).
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const LEGACY_PATH = join(homedir(), '.aptos-agent-wallet.json')
const WALLETS_PATH = join(homedir(), '.aptos-agent-wallets.json')

/**
 * @returns {{ address: string, privateKey: string, network?: string, createdAt?: string }|null}
 * Returns the default (first) wallet for backward compatibility.
 */
export function load() {
  const multi = loadAll()
  if (!multi.wallets.length) return null
  const idx = Math.min(multi.defaultIndex ?? 0, multi.wallets.length - 1)
  return multi.wallets[idx]
}

/**
 * @returns {{ wallets: Array<{ address: string, privateKey: string, network?: string, createdAt?: string }>, defaultIndex: number }}
 */
export function loadAll() {
  try {
    if (existsSync(WALLETS_PATH)) {
      const data = readFileSync(WALLETS_PATH, 'utf8')
      const parsed = JSON.parse(data)
      const wallets = Array.isArray(parsed.wallets) ? parsed.wallets : []
      const defaultIndex = typeof parsed.defaultIndex === 'number' ? parsed.defaultIndex : 0
      return { wallets, defaultIndex }
    }
    if (existsSync(LEGACY_PATH)) {
      const data = readFileSync(LEGACY_PATH, 'utf8')
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
    throw new Error(`Failed to load Aptos wallets: ${e.message}`)
  }
}

/**
 * @param {{ wallets: Array<{ address: string, privateKey: string, network?: string, createdAt?: string }>, defaultIndex: number }} data
 */
export function saveAll(data) {
  try {
    const out = {
      wallets: (data.wallets || []).map((w) => ({
        ...w,
        createdAt: w.createdAt || new Date().toISOString(),
      })),
      defaultIndex: data.defaultIndex ?? 0,
    }
    writeFileSync(WALLETS_PATH, JSON.stringify(out, null, 2), 'utf8')
    chmodSync(WALLETS_PATH, 0o600)
  } catch (e) {
    throw new Error(`Failed to save Aptos wallets: ${e.message}`)
  }
}

/**
 * Add or update a wallet. If address exists, update; otherwise append. Optionally set as default.
 * @param {{ address: string, privateKey: string, network?: string, createdAt?: string }} wallet
 * @param {{ setDefault?: boolean }} options
 */
export function save(wallet, options = {}) {
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
    data.defaultIndex = data.wallets.findIndex((w) => w.address === wallet.address)
    if (data.defaultIndex < 0) data.defaultIndex = data.wallets.length - 1
  }
  saveAll(data)
}

/**
 * @returns {{ address: string, privateKey: string }}
 */
export function getWallet() {
  const w = load()
  if (!w) throw new Error('No Aptos wallet found. Run setup-aptos.js or create_aptos_wallet first.')
  return { address: w.address, privateKey: w.privateKey }
}

/**
 * Get wallet by index or by address. Returns default if no arg.
 * @param {number|string} [indexOrAddress] - index in list or address string
 * @returns {{ address: string, privateKey: string, network?: string }|null}
 */
export function getWalletAt(indexOrAddress) {
  const data = loadAll()
  if (data.wallets.length === 0) return null
  if (typeof indexOrAddress === 'number') {
    const w = data.wallets[indexOrAddress]
    return w ? { address: w.address, privateKey: w.privateKey, network: w.network } : null
  }
  if (typeof indexOrAddress === 'string' && indexOrAddress.trim()) {
    const addr = indexOrAddress.trim().toLowerCase()
    const w = data.wallets.find((x) => (x.address || '').toLowerCase() === addr)
    return w ? { address: w.address, privateKey: w.privateKey, network: w.network } : null
  }
  const idx = Math.min(data.defaultIndex ?? 0, data.wallets.length - 1)
  const w = data.wallets[idx]
  return w ? { address: w.address, privateKey: w.privateKey, network: w.network } : null
}

export function exists() {
  const data = loadAll()
  return data.wallets.length > 0
}

/**
 * @returns {{ address: string, network?: string, createdAt: string }|null} - default wallet only (no private key)
 */
export function getWalletInfo() {
  const w = load()
  if (!w) return null
  return { address: w.address, network: w.network || null, createdAt: w.createdAt || '' }
}

/**
 * @returns {Array<{ address: string, network?: string }>} - all wallets (no private keys)
 */
export function getAllWalletInfos() {
  const data = loadAll()
  return data.wallets.map((w) => ({ address: w.address, network: w.network || null }))
}
