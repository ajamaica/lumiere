# QUOTE Skill - Viem-Only Price Quotes and Curve State

Pure viem implementation for querying bonding curve prices and state. No SDK dependencies required. Supports testnet and mainnet.

## Setup

Include this configuration in every example:

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet' // Change to 'mainnet' for production
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})
```

## 1. getAmountOut

Get expected output amount for a buy or sell transaction.

**When to use:**

- User is buying tokens with MON: `isBuy = true`
- User is selling tokens for MON: `isBuy = false`

**Returns:**

- `router`: Which router contract to use for the transaction
- `amount`: Expected output amount in wei

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet' // Change to 'mainnet' for production
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const lensAbi = [
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_amountIn', type: 'uint256', internalType: 'uint256' },
      { name: '_isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'router', type: 'address', internalType: 'address' },
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address
  const amountIn = 100000000000000000n // 0.1 MON (18 decimals)
  const isBuy = true // true = buy, false = sell

  const [router, amountOut] = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress, amountIn, isBuy],
  })

  console.log('Router:', router)
  console.log('Amount out:', amountOut.toString())
  console.log('Amount out (wei):', amountOut)
}

main()
```

## 2. getAmountIn

Get required input amount for a desired output amount. Inverse of `getAmountOut`.

**When to use:**

- You want to receive exactly X tokens and need to know how much MON to send
- You want to send exactly X tokens and need to know how much MON you'll get back

**Returns:**

- `router`: Which router contract to use
- `amountIn`: Required input amount in wei

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const lensAbi = [
  {
    type: 'function',
    name: 'getAmountIn',
    inputs: [
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_amountOut', type: 'uint256', internalType: 'uint256' },
      { name: '_isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'router', type: 'address', internalType: 'address' },
      { name: 'amountIn', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address
  const amountOut = 1000000000000000000000n // 1000 tokens (18 decimals)
  const isBuy = true // true = buying tokens, false = selling tokens

  const [router, amountIn] = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: 'getAmountIn',
    args: [tokenAddress, amountOut, isBuy],
  })

  console.log('Router:', router)
  console.log('Amount in required:', amountIn.toString())
  console.log('Amount in (wei):', amountIn)
}

main()
```

## 3. getCurveState

Get complete bonding curve state including reserves, K value, and graduation target.

**Returns object with:**

- `realMonReserve`: Actual MON in the pool
- `realTokenReserve`: Actual tokens in the pool
- `virtualMonReserve`: Virtual MON for pricing (includes real)
- `virtualTokenReserve`: Virtual tokens for pricing (includes real)
- `k`: Constant product (x \* y = k) for the bonding curve
- `targetTokenAmount`: Token amount needed to graduate to DEX
- `initVirtualMonReserve`: Initial virtual MON at creation
- `initVirtualTokenReserve`: Initial virtual tokens at creation

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const curveAbi = [
  {
    type: 'function',
    name: 'curves',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'realMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'realTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'k', type: 'uint256', internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualTokenReserve', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address

  const [
    realMonReserve,
    realTokenReserve,
    virtualMonReserve,
    virtualTokenReserve,
    k,
    targetTokenAmount,
    initVirtualMonReserve,
    initVirtualTokenReserve,
  ] = await publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'curves',
    args: [tokenAddress],
  })

  console.log('Real MON Reserve:', realMonReserve.toString())
  console.log('Real Token Reserve:', realTokenReserve.toString())
  console.log('Virtual MON Reserve:', virtualMonReserve.toString())
  console.log('Virtual Token Reserve:', virtualTokenReserve.toString())
  console.log('K (constant product):', k.toString())
  console.log('Target Token Amount (graduation):', targetTokenAmount.toString())
  console.log('Init Virtual MON:', initVirtualMonReserve.toString())
  console.log('Init Virtual Token:', initVirtualTokenReserve.toString())
}

main()
```

## 4. getProgress

Get graduation progress as percentage (0-10000 representing 0-100%).

**Returns:**

- `progress`: Bigint from 0 to 10000 (divide by 100 to get percentage)
- 0 = 0% (just created)
- 5000 = 50% (halfway to graduation)
- 10000 = 100% (ready to graduate)

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const lensAbi = [
  {
    type: 'function',
    name: 'getProgress',
    inputs: [{ name: '_token', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'progress', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address

  const progress = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: 'getProgress',
    args: [tokenAddress],
  })

  const percentage = Number(progress) / 100
  console.log(`Progress: ${percentage}%`)
  console.log(`Raw value: ${progress.toString()}`)

  // Example checks
  if (progress >= 10000n) {
    console.log('Token is ready for graduation')
  } else {
    console.log(`${10000n - progress} remaining to graduate`)
  }
}

main()
```

## 5. isGraduated

Check if a token has moved from bonding curve to DEX.

**Returns:**

- `true` if token graduated to Uniswap V3
- `false` if still on bonding curve

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const curveAbi = [
  {
    type: 'function',
    name: 'isGraduated',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address

  const graduated = await publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'isGraduated',
    args: [tokenAddress],
  })

  if (graduated) {
    console.log('Token has graduated to DEX')
  } else {
    console.log('Token is still on bonding curve')
  }
}

main()
```

## 6. isLocked

Check if a token's bonding curve is locked (cannot trade).

**Returns:**

- `true` if token is locked (no trading allowed)
- `false` if token can be traded

**Copy-Paste Example:**

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const curveAbi = [
  {
    type: 'function',
    name: 'isLocked',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Token address

  const locked = await publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'isLocked',
    args: [tokenAddress],
  })

  if (locked) {
    console.log('Token curve is locked - no trading allowed')
  } else {
    console.log('Token curve is open - trading allowed')
  }
}

main()
```

## Complete Example: Full Token Analysis

Query everything about a token in one script:

```typescript
import { createPublicClient, http } from 'viem'

const NETWORK = 'testnet'
const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  },
}[NETWORK]

const publicClient = createPublicClient({
  chain: {
    id: CONFIG.chainId,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
  },
  transport: http(CONFIG.rpcUrl),
})

const lensAbi = [
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: '_token', type: 'address', internalType: 'address' },
      { name: '_amountIn', type: 'uint256', internalType: 'uint256' },
      { name: '_isBuy', type: 'bool', internalType: 'bool' },
    ],
    outputs: [
      { name: 'router', type: 'address', internalType: 'address' },
      { name: 'amountOut', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProgress',
    inputs: [{ name: '_token', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'progress', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
] as const

const curveAbi = [
  {
    type: 'function',
    name: 'curves',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'realMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'realTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'virtualTokenReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'k', type: 'uint256', internalType: 'uint256' },
      { name: 'targetTokenAmount', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualMonReserve', type: 'uint256', internalType: 'uint256' },
      { name: 'initVirtualTokenReserve', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isGraduated',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isLocked',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
] as const

async function main() {
  const tokenAddress = '0x...' // Your token address
  const buyAmount = 100000000000000000n // 0.1 MON

  // Get quote for buying
  const [buyRouter, buyAmountOut] = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress, buyAmount, true],
  })

  // Get curve state
  const [
    realMon,
    realTokens,
    virtualMon,
    virtualTokens,
    k,
    targetTokenAmount,
    initVirtualMon,
    initVirtualTokens,
  ] = await publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'curves',
    args: [tokenAddress],
  })

  // Get progress
  const progress = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: 'getProgress',
    args: [tokenAddress],
  })

  // Get status
  const [graduated, locked] = await Promise.all([
    publicClient.readContract({
      address: CONFIG.CURVE,
      abi: curveAbi,
      functionName: 'isGraduated',
      args: [tokenAddress],
    }),
    publicClient.readContract({
      address: CONFIG.CURVE,
      abi: curveAbi,
      functionName: 'isLocked',
      args: [tokenAddress],
    }),
  ])

  // Print results
  console.log('=== Token Analysis ===')
  console.log('Token:', tokenAddress)
  console.log('')
  console.log('=== Price Quote ===')
  console.log(`Buy 0.1 MON -> ${buyAmountOut.toString()} tokens`)
  console.log('Router:', buyRouter)
  console.log('')
  console.log('=== Curve State ===')
  console.log('Real MON:', realMon.toString())
  console.log('Real Tokens:', realTokens.toString())
  console.log('Virtual MON:', virtualMon.toString())
  console.log('Virtual Tokens:', virtualTokens.toString())
  console.log('K:', k.toString())
  console.log('Target for Graduation:', targetTokenAmount.toString())
  console.log('')
  console.log('=== Progress ===')
  console.log(`${Number(progress) / 100}% to graduation`)
  console.log('')
  console.log('=== Status ===')
  console.log('Graduated:', graduated)
  console.log('Locked:', locked)
}

main().catch(console.error)
```

## Common Use Cases

### Check if token can be bought

```typescript
// Check if NOT graduated and NOT locked
const [graduated, locked] = await Promise.all([
  publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'isGraduated',
    args: [tokenAddress],
  }),
  publicClient.readContract({
    address: CONFIG.CURVE,
    abi: curveAbi,
    functionName: 'isLocked',
    args: [tokenAddress],
  }),
])

const canBuy = !graduated && !locked
console.log('Can buy:', canBuy)
```

### Calculate price per token

```typescript
const buyAmount = 100000000000000000n // 0.1 MON
const [, tokenAmount] = await publicClient.readContract({
  address: CONFIG.LENS,
  abi: lensAbi,
  functionName: 'getAmountOut',
  args: [tokenAddress, buyAmount, true],
})

// Price per token = MON spent / tokens received
const pricePerToken = buyAmount / tokenAmount // In MON per token
console.log('Price:', pricePerToken.toString(), 'MON per token')
```

### How many tokens remain until graduation

```typescript
const [, , , , , targetTokenAmount] = await publicClient.readContract({
  address: CONFIG.CURVE,
  abi: curveAbi,
  functionName: 'curves',
  args: [tokenAddress],
})

// Can also get realTokenReserve to calculate remaining
const remaining = targetTokenAmount - realTokenReserve
console.log('Tokens remaining to graduate:', remaining.toString())
```

## Network Details

### Testnet

- Chain ID: 10143
- RPC: https://monad-testnet.drpc.org
- LENS: 0xB056d79CA5257589692699a46623F901a3BB76f1
- CURVE: 0x1228b0dc9481C11D3071E7A924B794CfB038994e

### Mainnet

- Chain ID: 143
- RPC: https://monad-mainnet.drpc.org
- LENS: 0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea
- CURVE: 0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE
