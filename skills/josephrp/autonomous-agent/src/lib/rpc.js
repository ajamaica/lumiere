/**
 * RPC Manager with automatic retry and fallback rotation
 */

import { createPublicClient, http } from 'viem'

import { chains, getChain } from './chains.js'

/**
 * RPC state tracking
 */
const rpcState = new Map()

/**
 * Get working RPC for a chain with automatic fallback
 * @param {string} chainName - Chain name
 * @returns {string} Working RPC URL
 */
function getWorkingRpc(chainName) {
  const chain = getChain(chainName)

  if (!rpcState.has(chainName)) {
    rpcState.set(chainName, {
      rpcs: [...chain.rpcs],
      currentIndex: 0,
      failedRpcs: new Set(),
    })
  }

  const state = rpcState.get(chainName)

  // If all RPCs failed, reset and start over
  if (state.failedRpcs.size >= state.rpcs.length) {
    state.failedRpcs.clear()
    state.currentIndex = 0
  }

  // Find next working RPC
  while (state.failedRpcs.has(state.rpcs[state.currentIndex])) {
    state.currentIndex = (state.currentIndex + 1) % state.rpcs.length
  }

  return state.rpcs[state.currentIndex]
}

/**
 * Mark an RPC as failed and rotate to next
 * @param {string} chainName - Chain name
 * @param {string} failedRpc - Failed RPC URL
 */
function markRpcFailed(chainName, failedRpc) {
  const state = rpcState.get(chainName)
  if (state) {
    state.failedRpcs.add(failedRpc)
    state.currentIndex = (state.currentIndex + 1) % state.rpcs.length
  }
}

/**
 * Create viem public client with automatic retry/rotation
 * @param {string} chainName - Chain name
 * @returns {Object} Viem public client
 */
export function createPublicClientWithRetry(chainName) {
  const chain = getChain(chainName)

  // Create viem chain config
  const viemChain = {
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: {
      name: chain.nativeToken.symbol,
      symbol: chain.nativeToken.symbol,
      decimals: chain.nativeToken.decimals,
    },
    rpcUrls: {
      default: { http: [getWorkingRpc(chainName)] },
      public: { http: [getWorkingRpc(chainName)] },
    },
    blockExplorers: {
      default: {
        name: chain.explorer.name,
        url: chain.explorer.url,
      },
    },
  }

  const transport = http(getWorkingRpc(chainName), {
    retryCount: 0, // We handle retries manually
    timeout: 10_000,
    onFetchRequest: (request) => {
      // Optional: log requests in debug mode
    },
    onFetchResponse: (response) => {
      // Optional: log responses in debug mode
    },
  })

  const client = createPublicClient({
    chain: viemChain,
    transport,
  })

  // Wrap methods with retry logic
  const originalRequest = client.request.bind(client)
  client.request = async (args) => {
    let lastError
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await originalRequest(args)
      } catch (error) {
        lastError = error

        // If this isn't the last attempt, try next RPC
        if (attempt < maxRetries - 1) {
          const currentRpc = getWorkingRpc(chainName)
          markRpcFailed(chainName, currentRpc)

          // Update transport to use new RPC
          const newRpc = getWorkingRpc(chainName)
          viemChain.rpcUrls.default.http = [newRpc]
          viemChain.rpcUrls.public.http = [newRpc]

          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }

    throw lastError
  }

  return client
}

/**
 * Test RPC connectivity for all chains
 * @returns {Object} Status for each chain
 */
export async function testRpcConnectivity() {
  const results = {}

  for (const chainName of Object.keys(chains)) {
    try {
      const client = createPublicClientWithRetry(chainName)
      const blockNumber = await client.getBlockNumber()
      results[chainName] = {
        status: 'connected',
        blockNumber: blockNumber.toString(),
        rpc: getWorkingRpc(chainName),
      }
    } catch (error) {
      results[chainName] = {
        status: 'failed',
        error: error.message,
        rpc: getWorkingRpc(chainName),
      }
    }
  }

  return results
}

/**
 * Reset RPC state (clear failed RPC cache)
 * @param {string} [chainName] - Specific chain to reset, or all if not provided
 */
export function resetRpcState(chainName = null) {
  if (chainName) {
    rpcState.delete(chainName)
  } else {
    rpcState.clear()
  }
}
