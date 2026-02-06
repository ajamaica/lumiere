# Trading Skills Guide

Complete viem-only trading implementation for nad.fun with full support for testnet and mainnet Monad chain.

**Note**: All ABI definitions previously found in this document have been centralized in `ABI.md` for better organization and consistency. Please refer to `ABI.md` for the complete ABI structures.

## Network & Setup

### Supported Networks

- **testnet**: Monad Testnet (Chain ID: 10143)
- **mainnet**: Monad Mainnet (Chain ID: 143)

### Basic Setup

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseEther,
  formatEther,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'

// Assume ABIs are globally available or imported from ABI.md if it were a .ts file
// For documentation purposes, we will refer to them by name directly.
declare const routerAbi: any
declare const lensAbi: any
declare const erc20Abi: any

// Configuration
const NETWORK = 'testnet'
const CONFIG: Record<string, any> = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
    BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
    DEX_ROUTER: '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
    BONDING_CURVE_ROUTER: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
    DEX_ROUTER: '0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137',
  },
}

const config = CONFIG[NETWORK]

// Chain definition for mainnet
const monadMainnet = {
  id: 143,
  name: 'Monad Mainnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://monad-mainnet.drpc.org'] },
  },
}

const chain = NETWORK === 'testnet' ? monadTestnet : monadMainnet

// Setup clients
const privateKey = '0x...' // Your private key
const account = privateKeyToAccount(privateKey)

const publicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(config.rpcUrl),
})

console.log('Wallet Address:', account.address)
```

## 1. Buy Function

Purchase tokens on the bonding curve with MON. Full flow:

1. Call `getAmountOut` on LENS contract to get router and expected output
2. Calculate `amountOutMin` with slippage protection (typically 0.5-1%)
3. Set deadline (current time + 300 seconds)
4. Encode function data with `buy` ABI
5. Send transaction with native MON as value

### Complete Buy Example

```typescript
import { encodeFunctionData, parseEther, formatEther } from 'viem'

async function buyTokens(tokenAddress: string, monAmount: string) {
  try {
    // Step 1: Get quote from LENS contract
    console.log('Getting quote...')
    const [router, amountOut] = await publicClient.readContract({
      address: config.LENS,
      abi: lensAbi,
      functionName: 'getAmountOut',
      args: [tokenAddress as `0x${string}`, parseEther(monAmount), true],
    })

    console.log(`Quote: ${monAmount} MON -> ${formatEther(amountOut)} tokens`)
    console.log(`Router: ${router}`)

    // Step 2: Calculate amountOutMin with 1% slippage
    const slippagePercent = 1n // 1%
    const amountOutMin = (amountOut * (100n - slippagePercent)) / 100n

    // Step 3: Set deadline (5 minutes from now)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

    // Step 4: Encode function call
    const callData = encodeFunctionData({
      abi: routerAbi,
      functionName: 'buy',
      args: [
        {
          amountOutMin,
          token: tokenAddress as `0x${string}`,
          to: account.address,
          deadline,
        },
      ],
    })

    // Step 5: Send transaction with MON as value
    console.log('Sending buy transaction...')
    const hash = await walletClient.sendTransaction({
      account,
      to: router as `0x${string}`,
      data: callData,
      value: parseEther(monAmount),
      chain,
    })

    // Step 6: Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Transaction confirmed: ${receipt.transactionHash}`)

    return receipt.transactionHash
  } catch (error) {
    console.error('Buy failed:', error)
    throw error
  }
}

// Usage
await buyTokens('0x...', '0.1') // Buy with 0.1 MON
```

### Buy Parameters

| Parameter      | Type      | Description                                     |
| -------------- | --------- | ----------------------------------------------- |
| `amountOutMin` | `bigint`  | Minimum tokens to receive (slippage protection) |
| `token`        | `Address` | Token contract address                          |
| `to`           | `Address` | Recipient address for tokens                    |
| `deadline`     | `bigint`  | Unix timestamp when trade expires               |

### Buy Error Handling

```typescript
async function buyWithErrorHandling(tokenAddress: string, monAmount: string) {
  try {
    return await buyTokens(tokenAddress, monAmount)
  } catch (error: any) {
    if (error.message.includes('DeadlineExpired')) {
      console.error('Transaction deadline expired')
    } else if (error.message.includes('InsufficientAmountOut')) {
      console.error('Slippage too high, insufficient output')
    } else if (error.message.includes('InsufficientMon')) {
      console.error('Insufficient MON balance')
    } else {
      console.error('Unknown error:', error.message)
    }
    throw error
  }
}
```

## 2. Sell Function

Sell tokens back to MON on the bonding curve. Full flow:

1. Get current token balance
2. Call `getAmountOut` with `isBuy=false` to get router and MON output
3. Approve router to spend tokens
4. Calculate `amountOutMin` with slippage
5. Set deadline
6. Encode and send sell transaction

### Complete Sell Example

```typescript
async function sellTokens(tokenAddress: string) {
  try {
    // Step 1: Get token balance
    console.log('Checking balance...')
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })

    console.log(`Balance: ${formatEther(balance)} tokens`)

    if (balance === 0n) {
      throw new Error('No tokens to sell')
    }

    // Step 2: Get quote for selling
    console.log('Getting sell quote...')
    const [router, amountOut] = await publicClient.readContract({
      address: config.LENS,
      abi: lensAbi,
      functionName: 'getAmountOut',
      args: [tokenAddress as `0x${string}`, balance, false], // isBuy=false
    })

    console.log(`Quote: ${formatEther(balance)} tokens -> ${formatEther(amountOut)} MON`)
    console.log(`Router: ${router}`)

    // Step 3: Approve router to spend tokens
    console.log('Approving router...')
    const approveHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [router as `0x${string}`, balance],
      account,
      chain,
    })

    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    console.log('Approval confirmed')

    // Step 4: Calculate amountOutMin with 1% slippage
    const amountOutMin = (amountOut * 99n) / 100n

    // Step 5: Set deadline
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

    // Step 6: Encode sell call
    const callData = encodeFunctionData({
      abi: routerAbi,
      functionName: 'sell',
      args: [
        {
          amountIn: balance,
          amountOutMin,
          token: tokenAddress as `0x${string}`,
          to: account.address,
          deadline,
        },
      ],
    })

    // Step 7: Send sell transaction (no value, only calldata)
    console.log('Sending sell transaction...')
    const sellHash = await walletClient.sendTransaction({
      account,
      to: router as `0x${string}`,
      data: callData,
      chain,
    })

    // Step 8: Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: sellHash })
    console.log(`Transaction confirmed: ${receipt.transactionHash}`)

    return receipt.transactionHash
  } catch (error) {
    console.error('Sell failed:', error)
    throw error
  }
}

// Usage
await sellTokens('0x...')
```

### Sell Parameters

| Parameter      | Type      | Description                                  |
| -------------- | --------- | -------------------------------------------- |
| `amountIn`     | `bigint`  | Token amount to sell                         |
| `amountOutMin` | `bigint`  | Minimum MON to receive (slippage protection) |
| `token`        | `Address` | Token contract address                       |
| `to`           | `Address` | Recipient address for MON                    |
| `deadline`     | `bigint`  | Unix timestamp when trade expires            |

### Sell Common Issues

```typescript
// Issue: Insufficient allowance
// Solution: Check and approve before selling
const allowance = await publicClient.readContract({
  address: tokenAddress as `0x${string}`,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [account.address, router as `0x${string}`],
})

if (allowance < balance) {
  console.log('Allowance insufficient, approving...')
  // Run approve step
}

// Issue: Slippage too high
// Solution: Adjust slippage tolerance or check market conditions
const slippage = 2n // 2% instead of 1%
const amountOutMin = (amountOut * (100n - slippage)) / 100n
```

## 3. Sell with Permit

Sell tokens using EIP-2612 permit signature instead of separate approve transaction. Single-step authorization.

### Complete Sell Permit Example

```typescript
async function sellWithPermit(tokenAddress: string) {
  try {
    // Step 1: Get balance
    console.log('Checking balance...')
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    })

    if (balance === 0n) {
      throw new Error('No tokens to sell')
    }

    // Step 2: Get quote
    console.log('Getting quote...')
    const [router, amountOut] = await publicClient.readContract({
      address: config.LENS,
      abi: lensAbi,
      functionName: 'getAmountOut',
      args: [tokenAddress as `0x${string}`, balance, false],
    })

    // Step 3: Get token nonce for permit
    console.log('Getting nonce...')
    const nonce = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'nonces',
      args: [account.address],
    })

    // Step 4: Get token name for EIP-712 domain
    let tokenName = 'Unknown'
    try {
      tokenName = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            // Minimal ABI for name() function
            type: 'function',
            name: 'name',
            inputs: [],
            outputs: [{ type: 'string' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'name',
      })
    } catch {
      // Use default name if read fails
    }

    // Step 5: Set deadline
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

    // Step 6: Sign permit message (EIP-712)
    console.log('Signing permit...')
    const signature = await walletClient.signTypedData({
      account,
      domain: {
        name: tokenName,
        version: '1',
        chainId: chain.id,
        verifyingContract: tokenAddress as `0x${string}`,
      },
      types: {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner: account.address,
        spender: router as `0x${string}`,
        value: balance,
        nonce,
        deadline,
      },
    })

    // Step 7: Parse signature to v, r, s
    const r = `0x${signature.slice(2, 66)}` as `0x${string}`
    const s = `0x${signature.slice(66, 130)}` as `0x${string}`
    const v = parseInt(signature.slice(130, 132), 16) as 27 | 28

    console.log(`Signature: v=${v}, r=${r.slice(0, 10)}..., s=${s.slice(0, 10)}...`)

    // Step 8: Calculate amountOutMin with slippage
    const amountOutMin = (amountOut * 99n) / 100n

    // Step 9: Encode sellPermit call
    const callData = encodeFunctionData({
      abi: routerAbi,
      functionName: 'sellPermit',
      args: [
        {
          amountIn: balance,
          amountOutMin,
          amountAllowance: balance,
          token: tokenAddress as `0x${string}`,
          to: account.address,
          deadline,
          v,
          r,
          s,
        },
      ],
    })

    // Step 10: Send sellPermit transaction (no separate approve needed!)
    console.log('Sending sellPermit transaction...')
    const hash = await walletClient.sendTransaction({
      account,
      to: router as `0x${string}`,
      data: callData,
      chain,
    })

    // Step 11: Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Transaction confirmed: ${receipt.transactionHash}`)

    return receipt.transactionHash
  } catch (error) {
    console.error('Sell with permit failed:', error)
    throw error
  }
}

// Usage
await sellWithPermit('0x...')
```

### Permit Signature Parameters

The permit signature is parsed from the EIP-712 signature:

| Parameter | Type          | Description                         |
| --------- | ------------- | ----------------------------------- |
| `v`       | `27 \| 28`    | Signature recovery ID (last 1 byte) |
| `r`       | `0x${string}` | Signature r value (bytes 0-32)      |
| `s`       | `0x${string}` | Signature s value (bytes 32-64)     |
| `nonce`   | `bigint`      | Current nonce from token contract   |

### Permit Signature Parsing

```typescript
// Full EIP-712 signature is 65 bytes (130 hex chars + '0x')
const fullSignature = await walletClient.signTypedData({
  // ... domain, types, message
})

// Parse into v, r, s
const r = `0x${fullSignature.slice(2, 66)}` as `0x${string}` // bytes 0-32
const s = `0x${fullSignature.slice(66, 130)}` as `0x${string}` // bytes 32-64
const v = parseInt(fullSignature.slice(130, 132), 16) as 27 | 28 // last byte

console.log(`v: ${v} (27 or 28)`)
console.log(`r: ${r}`)
console.log(`s: ${s}`)
```

### Permit vs Approve Trade-off

| Method               | Advantages                            | Disadvantages                         |
| -------------------- | ------------------------------------- | ------------------------------------- |
| **Approve + Sell**   | Standard, compatible with all wallets | 2 transactions, costs gas for approve |
| **Sell with Permit** | 1 transaction, lower gas cost         | Requires EIP-2612 support             |

## 4. Quote Functions

Get price quotes without executing trades. Used by buy/sell to determine router and expected output.

### Get Amount Out (Buy/Sell Quote)

```typescript
async function getQuote(tokenAddress: string, monAmount: string, isBuy: boolean) {
  const [router, amountOut] = await publicClient.readContract({
    address: config.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [
      tokenAddress as `0x${string}`,
      parseEther(monAmount),
      isBuy, // true for buy, false for sell
    ],
  })

  return {
    router,
    amountOut,
    formattedAmount: formatEther(amountOut),
  }
}

// Buy quote: 1 MON -> ? tokens
const buyQuote = await getQuote('0x...', '1.0', true)
console.log(`1 MON -> ${buyQuote.formattedAmount} tokens`)
console.log(`Router: ${buyQuote.router}`)

// Sell quote: 1000 tokens -> ? MON (assuming 18 decimals)
const sellQuote = await getQuote('0x...', '1000.0', false)
console.log(`1000 tokens -> ${sellQuote.formattedAmount} MON`)
```

## 5. Gas Estimation

Estimate gas before submitting transactions.

### Estimate Buy Gas

```typescript
async function estimateBuyGas(tokenAddress: string, monAmount: string, routerAddress: string) {
  const amountIn = parseEther(monAmount)
  const quote = await publicClient.readContract({
    address: config.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, amountIn, true],
  })

  const [, amountOut] = quote as [string, bigint]
  const amountOutMin = (amountOut * 99n) / 100n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

  const callData = encodeFunctionData({
    abi: routerAbi,
    functionName: 'buy',
    args: [
      {
        amountOutMin,
        token: tokenAddress as `0x${string}`,
        to: account.address,
        deadline,
      },
    ],
  })

  const gasEstimate = await publicClient.estimateGas({
    account: account.address,
    to: routerAddress as `0x${string}`,
    data: callData,
    value: amountIn,
  })

  return gasEstimate
}

const gas = await estimateBuyGas('0x...', '0.1', '0x...')
console.log(`Estimated gas: ${gas.toString()}`)
```

### Estimate Sell Gas

```typescript
async function estimateSellGas(tokenAddress: string, tokenAmount: bigint, routerAddress: string) {
  const quote = await publicClient.readContract({
    address: config.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, tokenAmount, false],
  })

  const [, amountOut] = quote as [string, bigint]
  const amountOutMin = (amountOut * 99n) / 100n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

  const callData = encodeFunctionData({
    abi: routerAbi,
    functionName: 'sell',
    args: [
      {
        amountIn: tokenAmount,
        amountOutMin,
        token: tokenAddress as `0x${string}`,
        to: account.address,
        deadline,
      },
    ],
  })

  const gasEstimate = await publicClient.estimateGas({
    account: account.address,
    to: routerAddress as `0x${string}`,
    data: callData,
    value: 0n, // No native token sent for sell
  })

  return gasEstimate
}
```

## 6. Slippage Calculation

Standard formulas for slippage protection.

```typescript
function calculateSlippage(amountOut: bigint, slippageBps: bigint): bigint {
  // For buy: return the minimum tokens acceptable
  // For sell: return the minimum MON acceptable
  // slippageBps is in basis points (e.g., 50 for 0.5%, 100 for 1%)
  return (amountOut * (10000n - slippageBps)) / 10000n
}

// Examples
const amountOut = parseEther('100') // 100 tokens from quote

// 0.5% slippage (50 bps)
const min_0_5 = calculateSlippage(amountOut, 50n) // Tight, for stable pairs
console.log(`With 0.5% slippage: ${formatEther(min_0_5)}`)

// 1% slippage (100 bps)
const min_1 = calculateSlippage(amountOut, 100n) // Standard default
console.log(`With 1% slippage: ${formatEther(min_1)}`)

// 2% slippage (200 bps)
const min_2 = calculateSlippage(amountOut, 200n) // For volatile pairs
console.log(`With 2% slippage: ${formatEther(min_2)}`)

// 5% slippage (500 bps)
const min_5 = calculateSlippage(amountOut, 500n) // High slippage tolerance
console.log(`With 5% slippage: ${formatEther(min_5)}`)
```

## Common Patterns

### High-Volume Buy with Gas Control

```typescript
async function buyWithGasControl(
  tokenAddress: string,
  monAmount: string,
  gasLimit: bigint,
  gasPrice: bigint,
) {
  const quote = await publicClient.readContract({
    address: config.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, parseEther(monAmount), true],
  })

  const [router, amountOut] = quote as [`0x${string}`, bigint]
  const amountOutMin = (amountOut * 99n) / 100n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

  const callData = encodeFunctionData({
    abi: routerAbi,
    functionName: 'buy',
    args: [
      {
        amountOutMin,
        token: tokenAddress as `0x${string}`,
        to: account.address,
        deadline,
      },
    ],
  })

  return await walletClient.sendTransaction({
    account,
    to: router,
    data: callData,
    value: parseEther(monAmount),
    gas: gasLimit, // Custom gas limit
    gasPrice, // Custom gas price
    chain,
  })
}
```

### Batch Sell Multiple Tokens

```typescript
async function batchSell(tokenAddresses: string[]) {
  const results = []

  for (const tokenAddress of tokenAddresses) {
    try {
      console.log(`Selling ${tokenAddress}...`)
      const hash = await sellTokens(tokenAddress)
      results.push({ token: tokenAddress, hash, status: 'success' })
    } catch (error) {
      results.push({ token: tokenAddress, error: String(error), status: 'failed' })
    }

    // Add delay between transactions to avoid mempool issues
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return results
}
```

### Flash Quotes (No Execution)

```typescript
async function getFlashQuote(
  tokenAddress: string,
  monAmount: string,
): Promise<{ router: string; amountOut: string; slippageMin: string }> {
  const quote = await publicClient.readContract({
    address: config.LENS,
    abi: lensAbi,
    functionName: 'getAmountOut',
    args: [tokenAddress as `0x${string}`, parseEther(monAmount), true],
  })

  const [router, amountOut] = quote as [string, bigint]
  const slippageMin = formatEther((amountOut * 99n) / 100n)

  return {
    router,
    amountOut: formatEther(amountOut),
    slippageMin,
  }
}

const flash = await getFlashQuote('0x...', '1.0')
console.log(`1 MON -> ${flash.amountOut} tokens (min ${flash.slippageMin})`)
```

## Error Handling Checklist

```typescript
// Deadline errors
if (error.message.includes('DeadlineExpired')) {
  // Extend deadline or retry with fresh timestamp
}

// Slippage errors
if (error.message.includes('InsufficientAmountOut')) {
  // Reduce amount or increase slippage tolerance
}

// Balance errors
if (error.message.includes('InsufficientMon') || error.message.includes('InsufficientInput')) {
  // Check balance before transaction
}

// Approval errors (sell only)
if (error.message.includes('InvalidAllowance') || error.message.includes('InsufficientInput')) {
  // Ensure approve was called and confirmed
}

// Network/RPC errors
if (error.message.includes('network') || error.code === 'NETWORK_ERROR') {
  // Switch RPC endpoint or retry with exponential backoff
}
```

## Type Definitions

```typescript
interface BuyParams {
  token: `0x${string}`
  amountIn: bigint // Native MON amount
  amountOutMin: bigint // Slippage protection
  to: `0x${string}` // Recipient address
  deadline: bigint // Unix timestamp (seconds)
}

interface SellParams {
  token: `0x${string}`
  amountIn: bigint // Token amount to sell
  amountOutMin: bigint // Minimum MON to receive
  to: `0x${string}` // Recipient address
  deadline: bigint // Unix timestamp (seconds)
}

interface SellPermitParams extends SellParams {
  amountAllowance: bigint // Must equal amountIn
  v: 27 | 28
  r: `0x${string}`
  s: `0x${string}`
}

interface QuoteResult {
  router: `0x${string}`
  amountOut: bigint
}

interface PermitSignature {
  v: 27 | 28
  r: `0x${string}`
  s: `0x${string}`
  nonce: bigint
}
```

## Testing Checklist

- [ ] Buy with 0.1 MON on testnet
- [ ] Sell all purchased tokens back to MON
- [ ] Verify final MON balance (should be ~0.099 MON after slippage)
- [ ] Test sell with permit signature (no approve needed)
- [ ] Verify signature parsing (v must be 27 or 28)
- [ ] Test on mainnet with real values
- [ ] Test high slippage scenarios
- [ ] Test expired deadline (should fail)
- [ ] Estimate gas before sending transactions
- [ ] Test with different token decimals

## Quick Reference

| Operation           | Function                                                     | Input                           | Returns               |
| ------------------- | ------------------------------------------------------------ | ------------------------------- | --------------------- |
| Get Buy Quote       | `getAmountOut`                                               | token, monAmount, true          | (router, tokenAmount) |
| Get Sell Quote      | `getAmountOut`                                               | token, tokenAmount, false       | (router, monAmount)   |
| Execute Buy         | `buy` + `sendTransaction`                                    | BuyParams, router               | txHash                |
| Execute Sell        | `approve` + `sell` + `sendTransaction`                       | token, SellParams, router       | txHash                |
| Execute Sell Permit | `generatePermitSignature` + `sellPermit` + `sendTransaction` | token, SellPermitParams, router | txHash                |
| Estimate Gas        | `estimateGas`                                                | callData, value                 | bigint (gas units)    |
| Calculate Slippage  | `calculateSlippage`                                          | amount, bps                     | minAmount             |
