/**
 * Get Aptos balance (optional local tool for agent).
 * Calls Aptos RPC get_account_resource or get_balance for USDC.
 */

import { getAptosConfig } from './config.js'
import { getWalletInfo } from './wallet.js'

/**
 * @param {string} [address] - default: agent wallet address
 * @param {string} [assetType] - default: USDC testnet asset
 * @returns {Promise<{ balance: string, address: string, asset: string }|null>}
 */
export async function getAptosBalance(address, assetType) {
  const info = getWalletInfo()
  const addr = address || info?.address
  if (!addr) return null

  const cfg = getAptosConfig('testnet')
  const asset = assetType || cfg.usdcAsset
  if (!asset) return { balance: '0', address: addr, asset: 'unknown' }

  try {
    const res = await fetch(
      `${cfg.nodeUrl}/v1/accounts/${addr}/resource/0x1::coin::CoinStore<${asset}::coin::Coin>`,
    )
    if (!res.ok) return { balance: '0', address: addr, asset }
    const data = await res.json()
    const balance = data?.data?.coin?.value ?? '0'
    return { balance, address: addr, asset }
  } catch (e) {
    return { balance: '0', address: addr, asset, error: e.message }
  }
}
