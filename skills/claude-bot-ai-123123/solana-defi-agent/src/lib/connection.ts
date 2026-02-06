/**
 * Solana Connection Management
 */

import { Commitment, Connection } from '@solana/web3.js'

// Default RPC endpoints
const RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

export type NetworkType = keyof typeof RPC_ENDPOINTS

let defaultConnection: Connection | null = null

/**
 * Get or create a Solana connection
 */
export function getConnection(rpcUrl?: string, commitment: Commitment = 'confirmed'): Connection {
  const url = rpcUrl || process.env.SOLANA_RPC_URL || RPC_ENDPOINTS.mainnet

  if (!defaultConnection || (rpcUrl && rpcUrl !== defaultConnection.rpcEndpoint)) {
    defaultConnection = new Connection(url, {
      commitment,
      confirmTransactionInitialTimeout: 60000,
    })
  }

  return defaultConnection
}

/**
 * Create a new connection (doesn't affect default)
 */
export function createConnection(rpcUrl: string, commitment: Commitment = 'confirmed'): Connection {
  return new Connection(rpcUrl, {
    commitment,
    confirmTransactionInitialTimeout: 60000,
  })
}

/**
 * Get connection for a specific network
 */
export function getNetworkConnection(
  network: NetworkType,
  commitment: Commitment = 'confirmed',
): Connection {
  return createConnection(RPC_ENDPOINTS[network], commitment)
}

/**
 * Check if connection is healthy
 */
export async function checkConnection(connection: Connection): Promise<{
  healthy: boolean
  slot?: number
  version?: string
  error?: string
}> {
  try {
    const [slot, version] = await Promise.all([connection.getSlot(), connection.getVersion()])

    return {
      healthy: true,
      slot,
      version: version['solana-core'],
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get current slot
 */
export async function getCurrentSlot(connection?: Connection): Promise<number> {
  const conn = connection || getConnection()
  return conn.getSlot()
}

/**
 * Get recent blockhash
 */
export async function getRecentBlockhash(connection?: Connection): Promise<string> {
  const conn = connection || getConnection()
  const { blockhash } = await conn.getLatestBlockhash()
  return blockhash
}

export default getConnection
