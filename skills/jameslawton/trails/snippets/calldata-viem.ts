/**
 * Calldata Encoding with viem
 *
 * How to encode function calls for destination contract execution.
 * Used with Fund/Earn modes when you need to call a contract after bridging.
 *
 * NOTE: This is a utility snippet. To use Trails with calldata:
 * 1. Get your API key from https://dashboard.trails.build
 * 2. Install @0xtrails/trails (Widget/Headless) or @0xtrails/trails-api (Direct API)
 * 3. Use these encoding functions to generate calldata for your intents
 */

import { decodeFunctionData, encodeFunctionData, parseAbi } from 'viem'

// ============================================
// 1. PLACEHOLDER CONSTANT
// ============================================

/**
 * The placeholder amount that Trails replaces with the actual output.
 * Use this in EXACT_INPUT flows (Fund/Earn) where you don't know
 * the final amount until execution.
 */
export const PLACEHOLDER_AMOUNT = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
)

// ============================================
// 2. BASIC ENCODING
// ============================================

const vaultAbi = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
] as const

export function encodeVaultDeposit(receiver: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: vaultAbi,
    functionName: 'deposit',
    args: [PLACEHOLDER_AMOUNT, receiver],
  })
}

// Usage:
// const calldata = encodeVaultDeposit('0xUserAddress');

// ============================================
// 3. ERC-4626 VAULT
// ============================================

const erc4626Abi = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'mint',
    type: 'function',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
] as const

export function encodeERC4626Deposit(receiver: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: erc4626Abi,
    functionName: 'deposit',
    args: [PLACEHOLDER_AMOUNT, receiver],
  })
}

// ============================================
// 4. STAKING CONTRACT
// ============================================

const stakingAbi = [
  {
    name: 'stake',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'stakeFor',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'beneficiary', type: 'address' },
    ],
    outputs: [],
  },
] as const

export function encodeStake(): `0x${string}` {
  return encodeFunctionData({
    abi: stakingAbi,
    functionName: 'stake',
    args: [PLACEHOLDER_AMOUNT],
  })
}

export function encodeStakeFor(beneficiary: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: stakingAbi,
    functionName: 'stakeFor',
    args: [PLACEHOLDER_AMOUNT, beneficiary],
  })
}

// ============================================
// 5. LIQUIDITY POOL
// ============================================

const lpAbi = [
  {
    name: 'addLiquidity',
    type: 'function',
    inputs: [
      { name: 'tokenAmount', type: 'uint256' },
      { name: 'minLpTokens', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'lpTokens', type: 'uint256' }],
  },
] as const

export function encodeAddLiquidity(
  minLpTokens: bigint = BigInt(0),
  deadlineSeconds: number = 3600,
): `0x${string}` {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds)

  return encodeFunctionData({
    abi: lpAbi,
    functionName: 'addLiquidity',
    args: [PLACEHOLDER_AMOUNT, minLpTokens, deadline],
  })
}

// ============================================
// 6. GENERIC ENCODER (User-provided ABI)
// ============================================

interface EncodeFunctionParams {
  abiJson: string | readonly unknown[]
  functionName: string
  args: unknown[]
  usePlaceholderAt?: number // Index of arg to replace with placeholder
}

export function encodeGenericCall({
  abiJson,
  functionName,
  args,
  usePlaceholderAt,
}: EncodeFunctionParams): `0x${string}` {
  // Parse ABI if string
  const abi = typeof abiJson === 'string' ? (JSON.parse(abiJson) as readonly unknown[]) : abiJson

  // Replace arg with placeholder if specified
  const finalArgs = [...args]
  if (usePlaceholderAt !== undefined) {
    finalArgs[usePlaceholderAt] = PLACEHOLDER_AMOUNT
  }

  return encodeFunctionData({
    abi: abi as readonly unknown[],
    functionName,
    args: finalArgs,
  })
}

// Usage:
// const calldata = encodeGenericCall({
//   abiJson: '[{"name":"deposit","type":"function","inputs":[{"name":"amount","type":"uint256"}]}]',
//   functionName: 'deposit',
//   args: ['0'], // Will be replaced
//   usePlaceholderAt: 0,
// });

// ============================================
// 7. USING parseAbi (String ABI)
// ============================================

export function encodeFromSignature(
  functionSignature: string,
  args: readonly unknown[],
): `0x${string}` {
  // Parse a human-readable ABI signature
  const abi = parseAbi([functionSignature])

  // Extract function name from signature
  const match = functionSignature.match(/function\s+(\w+)/)
  if (!match) throw new Error('Invalid function signature')
  const functionName = match[1]

  return encodeFunctionData({
    abi,
    functionName,
    args,
  })
}

// Usage:
// const calldata = encodeFromSignature(
//   'function deposit(uint256 amount, address receiver)',
//   [PLACEHOLDER_AMOUNT, '0xUserAddress']
// );

// ============================================
// 8. DECODING (For Debugging)
// ============================================

export function decodeCalldata(
  abi: readonly unknown[],
  data: `0x${string}`,
): { functionName: string; args: readonly unknown[] } {
  return decodeFunctionData({
    abi,
    data,
  })
}

// Usage:
// const decoded = decodeCalldata(vaultAbi, calldata);
// console.log('Function:', decoded.functionName);
// console.log('Args:', decoded.args);

// ============================================
// 9. PRACTICAL EXAMPLES
// ============================================

// Example: Aave V3 Supply
const aaveV3Abi = [
  {
    name: 'supply',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const

export function encodeAaveSupply(
  asset: `0x${string}`,
  onBehalfOf: `0x${string}`,
  referralCode: number = 0,
): `0x${string}` {
  return encodeFunctionData({
    abi: aaveV3Abi,
    functionName: 'supply',
    args: [asset, PLACEHOLDER_AMOUNT, onBehalfOf, referralCode],
  })
}

// Example: Compound V3 Supply
const compoundV3Abi = [
  {
    name: 'supply',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export function encodeCompoundSupply(asset: `0x${string}`): `0x${string}` {
  return encodeFunctionData({
    abi: compoundV3Abi,
    functionName: 'supply',
    args: [asset, PLACEHOLDER_AMOUNT],
  })
}

// Example: Uniswap V3 exactInputSingle
const uniswapV3Abi = [
  {
    name: 'exactInputSingle',
    type: 'function',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const

export function encodeUniswapExactInputSingle(params: {
  tokenIn: `0x${string}`
  tokenOut: `0x${string}`
  fee: number
  recipient: `0x${string}`
  amountOutMinimum: bigint
}): `0x${string}` {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)

  return encodeFunctionData({
    abi: uniswapV3Abi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        fee: params.fee,
        recipient: params.recipient,
        deadline,
        amountIn: PLACEHOLDER_AMOUNT,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: BigInt(0),
      },
    ],
  })
}

// ============================================
// 10. VALIDATION HELPERS
// ============================================

export function isValidCalldata(data: string): boolean {
  // Basic validation: must be hex, start with 0x, and have at least function selector (4 bytes)
  return /^0x[a-fA-F0-9]{8,}$/.test(data)
}

export function getFunctionSelector(data: `0x${string}`): string {
  // First 4 bytes (8 hex chars) after 0x
  return data.slice(0, 10)
}

// Example selectors for common functions
export const KNOWN_SELECTORS = {
  // ERC-4626
  'deposit(uint256,address)': '0x6e553f65',
  'mint(uint256,address)': '0x94bf804d',
  'withdraw(uint256,address,address)': '0xb460af94',
  'redeem(uint256,address,address)': '0xba087652',

  // Common staking
  'stake(uint256)': '0xa694fc3a',

  // Aave V3
  'supply(address,uint256,address,uint16)': '0x617ba037',
} as const
