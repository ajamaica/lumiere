import type { Address } from 'viem'

// ═══════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════

export const API_ACCOUNT = 'https://mamo-queues.moonwell.workers.dev'
export const API_INDEXER = 'https://mamo-indexer.moonwell.workers.dev'

// ═══════════════════════════════════════════════════════════════
// Chain Configuration
// ═══════════════════════════════════════════════════════════════

export const CHAIN_ID = 8453
export const DEFAULT_RPC_URL = 'https://mainnet.base.org'
export const MIN_GAS_ETH = BigInt(1e14) // 0.0001 ETH

// ═══════════════════════════════════════════════════════════════
// Contract Addresses
// ═══════════════════════════════════════════════════════════════

export const REGISTRY_ADDRESS: Address = '0x46a5624C2ba92c08aBA4B206297052EDf14baa92'

// ═══════════════════════════════════════════════════════════════
// ABIs
// ═══════════════════════════════════════════════════════════════

export const FACTORY_ABI = [
  {
    name: 'createStrategyForUser',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'strategyTypeId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const

export const STRATEGY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdrawAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'token',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'strategyTypeId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const REGISTRY_ABI = [
  {
    name: 'getUserStrategies',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'address[]' }],
  },
  {
    name: 'isUserStrategy',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'strategy', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const
