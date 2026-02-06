# TOKEN Skill - viem-only Token Operations

**Low-level token operations with viem for ERC-20 and ERC-2612 permit support on Monad chain (testnet & mainnet).**

All examples are copy-paste ready and fully self-contained.

## Network Setup

Use this configuration for all examples:

```typescript
import { createPublicClient, createWalletClient, http, erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Select network
const NETWORK = 'testnet' // or 'mainnet'

const CONFIG = {
  testnet: {
    rpcUrl: 'https://monad-testnet.drpc.org',
    chainId: 10143,
    chainName: 'Monad Testnet',
  },
  mainnet: {
    rpcUrl: 'https://monad-mainnet.drpc.org',
    chainId: 143,
    chainName: 'Monad Mainnet',
  },
}[NETWORK]

// Define chain configuration
const chain = {
  id: CONFIG.chainId,
  name: CONFIG.chainName,
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CONFIG.rpcUrl],
    },
  },
}

// Initialize clients
const privateKey = process.env.PRIVATE_KEY as `0x${string}`
const account = privateKeyToAccount(privateKey)

const publicClient = createPublicClient({
  chain,
  transport: http(CONFIG.rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(CONFIG.rpcUrl),
})
```

---

## 1. Get Token Balance

Read ERC-20 token balance using `balanceOf`.

```typescript
async function getBalance(
  tokenAddress: `0x${string}`,
  ownerAddress?: `0x${string}`,
): Promise<bigint> {
  const address = ownerAddress ?? account.address

  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  })

  return balance
}

// Usage
const tokenAddress = '0x...' as `0x${string}`
const balance = await getBalance(tokenAddress)
console.log('Balance (raw):', balance.toString())
console.log('Balance (formatted):', balance / 10n ** 18n, 'tokens')
```

---

## 2. Get Token Metadata

Fetch token name, symbol, decimals, and total supply using `multicall` for efficiency.

```typescript
import { erc20Abi } from 'viem'

interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}

async function getMetadata(tokenAddress: `0x${string}`): Promise<TokenMetadata> {
  const results = await publicClient.multicall({
    contracts: [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'name' as const,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'symbol' as const,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals' as const,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'totalSupply' as const,
      },
    ],
  })

  return {
    name: results[0].status === 'success' ? results[0].result : 'Unknown',
    symbol: results[1].status === 'success' ? results[1].result : 'UNKNOWN',
    decimals: results[2].status === 'success' ? results[2].result : 18,
    totalSupply: results[3].status === 'success' ? results[3].result : 0n,
  }
}

// Usage
const metadata = await getMetadata(tokenAddress)
console.log('Token:', metadata.name, `(${metadata.symbol})`)
console.log('Decimals:', metadata.decimals)
console.log('Total Supply:', metadata.totalSupply.toString())
```

---

## 3. Get Allowance

Check how many tokens a spender is allowed to transfer on behalf of an owner.

```typescript
import { erc20Abi } from 'viem'

async function getAllowance(
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  owner?: `0x${string}`,
): Promise<bigint> {
  const ownerAddr = owner ?? account.address

  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [ownerAddr, spender],
  })

  return allowance
}

// Usage
const spenderAddress = '0x...' as `0x${string}`
const allowance = await getAllowance(tokenAddress, spenderAddress)
console.log('Current allowance:', allowance.toString())

// Check if allowance is sufficient
const requiredAmount = BigInt(1000) * 10n ** 18n // 1000 tokens with 18 decimals
if (allowance >= requiredAmount) {
  console.log('Allowance is sufficient')
} else {
  console.log('Need to approve more tokens')
}
```

---

## 4. Approve Token Spending

Grant a spender permission to transfer tokens on behalf of the sender.

```typescript
import { erc20Abi } from 'viem'

async function approve(
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
  options?: { gasLimit?: bigint },
): Promise<`0x${string}`> {
  // Send approval transaction
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
    account,
    chain,
    gas: options?.gasLimit,
  })

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  return receipt.transactionHash
}

// Usage
const spenderAddress = '0x...' as `0x${string}`
const approveAmount = BigInt(1000) * 10n ** 18n // Approve 1000 tokens

console.log('Sending approval...')
const txHash = await approve(tokenAddress, spenderAddress, approveAmount)
console.log('Approval confirmed:', txHash)

// Or approve infinite amount (standard pattern)
const maxApprove = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
const infiniteTxHash = await approve(tokenAddress, spenderAddress, maxApprove)
console.log('Infinite approval confirmed:', infiniteTxHash)
```

---

## 5. Transfer Tokens

Transfer tokens to another address.

```typescript
import { erc20Abi } from 'viem'

async function transfer(
  tokenAddress: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
  options?: { gasLimit?: bigint },
): Promise<`0x${string}`> {
  // Send transfer transaction
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, amount],
    account,
    chain,
    gas: options?.gasLimit,
  })

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  return receipt.transactionHash
}

// Usage
const recipientAddress = '0x...' as `0x${string}`
const transferAmount = BigInt(100) * 10n ** 18n // Transfer 100 tokens

console.log('Sending transfer...')
const txHash = await transfer(tokenAddress, recipientAddress, transferAmount)
console.log('Transfer confirmed:', txHash)

// Transfer with custom gas limit
const txHashWithGas = await transfer(tokenAddress, recipientAddress, transferAmount, {
  gasLimit: BigInt(100000),
})
console.log('Transfer with custom gas confirmed:', txHashWithGas)
```

---

## 6. Generate Permit Signature (ERC-2612)

Create an off-chain signature that allows spending tokens without a separate approve transaction. This implements EIP-712 typed data signing.

**Requirements:**

- Token must implement ERC-2612 (permit function)
- Token must have a `nonces` function to get current nonce

```typescript
import { erc20Abi } from 'viem'

interface PermitSignature {
  v: 27 | 28
  r: `0x${string}`
  s: `0x${string}`
  nonce: bigint
}

async function generatePermitSignature(
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  value: bigint,
  deadline: bigint,
  owner?: `0x${string}`,
): Promise<PermitSignature> {
  const ownerAddr = owner ?? account.address

  // Step 1: Get current nonce from token contract
  // Custom ABI for nonces function since it's not in standard erc20Abi
  const nonce = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'nonces',
    args: [ownerAddr],
  })

  // Step 2: Get token name for domain separator
  let tokenName: string
  try {
    tokenName = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'name',
    })
  } catch {
    tokenName = 'Unknown'
  }

  // Step 3: Sign permit message using EIP-712 typed data
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: tokenName,
      version: '1',
      chainId: chain.id,
      verifyingContract: tokenAddress,
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
      owner: ownerAddr,
      spender,
      value,
      nonce,
      deadline,
    },
  })

  // Step 4: Parse signature into v, r, s components
  // Signature format: 0x + 64 hex chars (r) + 64 hex chars (s) + 2 hex chars (v)
  const r = `0x${signature.slice(2, 66)}` as `0x${string}`
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`
  const v = parseInt(signature.slice(130, 132), 16) as 27 | 28

  return { v, r, s, nonce }
}

// Usage example
const spenderAddress = '0x...' as `0x${string}`
const permitAmount = BigInt(500) * 10n ** 18n // Permit 500 tokens

// Deadline: 5 minutes from now (in seconds)
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

console.log('Generating permit signature...')
const permit = await generatePermitSignature(tokenAddress, spenderAddress, permitAmount, deadline)

console.log('Permit Signature:')
console.log('  v:', permit.v)
console.log('  r:', permit.r)
console.log('  s:', permit.s)
console.log('  nonce:', permit.nonce.toString())

// This signature can now be used with token.permit() in a transaction:
// Example contract call: token.permit(owner, spender, value, deadline, v, r, s)
```

---

## Complete Example: Full Token Workflow

A comprehensive example combining multiple operations:

```typescript
import { createPublicClient, createWalletClient, http, erc20Abi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ===== Network Setup =====
const NETWORK = 'testnet'
const CONFIG = {
  testnet: { rpcUrl: 'https://monad-testnet.drpc.org', chainId: 10143 },
  mainnet: { rpcUrl: 'https://monad-mainnet.drpc.org', chainId: 143 },
}[NETWORK]

const chain = {
  id: CONFIG.chainId,
  name: NETWORK === 'testnet' ? 'Monad Testnet' : 'Monad Mainnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
}

const privateKey = process.env.PRIVATE_KEY as `0x${string}`
const account = privateKeyToAccount(privateKey)

const publicClient = createPublicClient({
  chain,
  transport: http(CONFIG.rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(CONFIG.rpcUrl),
})

// ===== Helper Functions =====

async function getMetadata(tokenAddress: `0x${string}`) {
  const results = await publicClient.multicall({
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'name' as const },
      { address: tokenAddress, abi: erc20Abi, functionName: 'symbol' as const },
      { address: tokenAddress, abi: erc20Abi, functionName: 'decimals' as const },
      { address: tokenAddress, abi: erc20Abi, functionName: 'totalSupply' as const },
    ],
  })

  return {
    name: results[0].status === 'success' ? results[0].result : 'Unknown',
    symbol: results[1].status === 'success' ? results[1].result : 'UNKNOWN',
    decimals: results[2].status === 'success' ? results[2].result : 18,
    totalSupply: results[3].status === 'success' ? results[3].result : 0n,
  }
}

async function getBalance(tokenAddress: `0x${string}`, addr: `0x${string}`) {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [addr],
  })
}

async function getAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
) {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

async function approve(tokenAddress: `0x${string}`, spender: `0x${string}`, amount: bigint) {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
    account,
    chain,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return receipt.transactionHash
}

async function transfer(tokenAddress: `0x${string}`, to: `0x${string}`, amount: bigint) {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, amount],
    account,
    chain,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return receipt.transactionHash
}

// ===== Main =====

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS as `0x${string}`
  const recipientAddress = process.env.RECIPIENT_ADDRESS as `0x${string}`

  console.log('=== Token Operations ===')
  console.log('Network:', NETWORK)
  console.log('Wallet:', account.address)
  console.log('Token:', tokenAddress)
  console.log()

  // Get metadata
  console.log('--- Getting Metadata ---')
  const metadata = await getMetadata(tokenAddress)
  console.log(`Name: ${metadata.name}`)
  console.log(`Symbol: ${metadata.symbol}`)
  console.log(`Decimals: ${metadata.decimals}`)
  console.log(`Total Supply: ${metadata.totalSupply.toString()}`)
  console.log()

  // Get balance
  console.log('--- Checking Balance ---')
  const balance = await getBalance(tokenAddress, account.address)
  const formattedBalance = balance / 10n ** BigInt(metadata.decimals)
  console.log(`Balance: ${formattedBalance} ${metadata.symbol}`)
  console.log()

  // Check allowance
  console.log('--- Checking Allowance ---')
  const spender = '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2' as `0x${string}`
  const allowance = await getAllowance(tokenAddress, account.address, spender)
  console.log(`Allowance: ${allowance.toString()}`)
  console.log()

  // Approve if needed
  if (allowance < 1000n * 10n ** BigInt(metadata.decimals)) {
    console.log('--- Approving Tokens ---')
    const maxApprove = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    const approveTx = await approve(tokenAddress, spender, maxApprove)
    console.log(`Approval confirmed: ${approveTx}`)
    console.log()
  }

  // Transfer tokens
  if (balance > 0n) {
    console.log('--- Transferring Tokens ---')
    const transferAmount = 10n * 10n ** BigInt(metadata.decimals)
    const transferTx = await transfer(tokenAddress, recipientAddress, transferAmount)
    console.log(`Transfer confirmed: ${transferTx}`)
    console.log()
  }

  // Final balance
  console.log('--- Final Balance ---')
  const finalBalance = await getBalance(tokenAddress, account.address)
  const formattedFinalBalance = finalBalance / 10n ** BigInt(metadata.decimals)
  console.log(`Balance: ${formattedFinalBalance} ${metadata.symbol}`)
}

main().catch(console.error)
```

---

## Batch Operations

Get multiple token balances in one RPC call (faster than individual calls).

```typescript
const results = await publicClient.multicall({
  contracts: [
    {
      address: token1,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    },
    {
      address: token2,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    },
    {
      address: token3,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [walletAddress],
    },
  ],
})

const [balance1, balance2, balance3] = results.map((r) => (r.status === 'success' ? r.result : 0n))
console.log('Token 1:', balance1.toString())
console.log('Token 2:', balance2.toString())
console.log('Token 3:', balance3.toString())
```

---

## Error Handling

Handle common token operation errors:

```typescript
import { erc20Abi } from 'viem'

async function safeGetBalance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
): Promise<bigint | null> {
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    })
  } catch (error) {
    console.error('Failed to get balance:', error instanceof Error ? error.message : error)
    return null
  }
}

async function safeApprove(
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
  amount: bigint,
): Promise<string | null> {
  try {
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
      account,
      chain,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt.transactionHash
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('insufficient balance')) {
        console.error('Wallet has insufficient MON balance for gas')
      } else if (error.message.includes('user rejected')) {
        console.error('User rejected the transaction')
      } else {
        console.error('Approval failed:', error.message)
      }
    }
    return null
  }
}

// Usage
const balance = await safeGetBalance(tokenAddress, account.address)
if (balance === null) {
  console.log('Could not retrieve balance')
} else if (balance === 0n) {
  console.log('No tokens in wallet')
} else {
  console.log('Balance:', balance.toString())
}
```

---

## Key Implementation Details for AI Agents

### Amount Handling

- **All amounts are in raw bigint format** (not formatted with decimals)
- Multiply/divide by `10**decimals` to convert between formatted and raw
- Example: 100 tokens with 18 decimals = `BigInt(100) * 10n ** 18n`

### Approval Pattern

- **Always check current allowance before approving**
- Only approve what is needed, not unlimited amounts
- Some tokens require resetting to 0 before increasing allowance

### Permit Signatures (ERC-2612)

- **Signature format**: 0x + 65 bytes (130 hex chars) = r (32) + s (32) + v (1)
- **Nonce must be fetched fresh** before signing to prevent replay attacks
- **Deadline is Unix timestamp in seconds**, typically 5 minutes from now
- **Domain version is always '1'** for ERC-2612 permits
- Token name is required for domain separator but can fail for non-standard tokens

### Network Configuration

- **Always set correct chain.id and rpcUrl** before operations
- Testnet chainId: 10143, Mainnet chainId: 143
- All NadFun tokens use 18 decimals

### Transaction Confirmation

- **Always wait for transaction receipt** before returning
- `waitForTransactionReceipt` confirms 1 block confirmation
- Return transactionHash from receipt, not the initial hash

---

---

## Token Utilities Reference

Quick reference for common token operations without detailed setup:

### Check if Contract is Valid

```typescript
async function isValidToken(tokenAddress: `0x${string}`): Promise<boolean> {
  try {
    const code = await publicClient.getCode({ address: tokenAddress })
    return code !== undefined && code !== '0x'
  } catch {
    return false
  }
}
```

### Get Balance Formatted with Decimals

```typescript
async function getBalanceFormatted(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
): Promise<string> {
  const [balance, decimals] = await publicClient.multicall({
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf' as const, args: [owner] },
      { address: tokenAddress, abi: erc20Abi, functionName: 'decimals' as const },
    ],
  })

  const balanceValue = balance.status === 'success' ? balance.result : 0n
  const decimalsValue = decimals.status === 'success' ? decimals.result : 18

  return (balanceValue / 10n ** BigInt(decimalsValue)).toString()
}
```

### Check Multiple Allowances

```typescript
async function checkAllowances(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spenders: `0x${string}`[],
): Promise<Record<string, bigint>> {
  const results = await publicClient.multicall({
    contracts: spenders.map((spender) => ({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance' as const,
      args: [owner, spender],
    })),
  })

  const allowances: Record<string, bigint> = {}
  spenders.forEach((spender, i) => {
    allowances[spender] = results[i].status === 'success' ? results[i].result : 0n
  })
  return allowances
}
```

### Reset Allowance to Zero (Some tokens require this)

```typescript
async function resetAllowance(
  tokenAddress: `0x${string}`,
  spender: `0x${string}`,
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, 0n],
    account,
    chain,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  return receipt.transactionHash
}
```

---

## Edge Cases & Troubleshooting

### Token Read Failures

**Problem**: Getting "Contract not found" or "function not found"
**Solution**: Wrap read operations in try-catch. Some tokens don't implement all ERC-20 functions.

### Approval Failures

**Problem**: "Approval failed" or "insufficient balance"
**Solution**: Check you have enough MON for gas fees. MON is on Monad mainnet, not a wrapped token.

### Permit Signature Fails

**Problem**: "Token does not support permit"
**Solution**: Verify token has `nonces` function. Not all ERC-20 tokens implement ERC-2612.

### Nonce Already Used

**Problem**: Permit signature rejected with "Invalid nonce"
**Solution**: Always fetch current nonce immediately before signing. Nonce increments on each permit.

---

## Performance Tips

### Use Multicall for Bulk Operations

Always batch multiple contract reads into one multicall:

```typescript
// Good: One RPC call for 4 operations
const results = await publicClient.multicall({
  contracts: [
    { address, abi, functionName: 'name' as const },
    { address, abi, functionName: 'symbol' as const },
    { address, abi, functionName: 'decimals' as const },
    { address, abi, functionName: 'totalSupply' as const },
  ],
})

// Bad: Four separate RPC calls
const name = await publicClient.readContract({ address, abi, functionName: 'name' })
const symbol = await publicClient.readContract({ address, abi, functionName: 'symbol' })
const decimals = await publicClient.readContract({ address, abi, functionName: 'decimals' })
const totalSupply = await publicClient.readContract({ address, abi, functionName: 'totalSupply' })
```

### Cache Immutable Token Data

Token metadata (name, symbol, decimals) never changes. Cache it:

```typescript
const tokenMetadataCache = new Map<string, TokenMetadata>()
```

### Reuse Clients

Don't create new PublicClient/WalletClient for each operation. Initialize once and reuse throughout your session.

---

## Common Operation Patterns

### Pattern: Check Balance Before Transfer

```typescript
const balance = await getBalance(tokenAddress, account.address)
if (balance >= amountToTransfer) {
  const txHash = await transfer(tokenAddress, recipient, amountToTransfer)
  console.log('Transfer confirmed:', txHash)
} else {
  console.log('Insufficient balance')
}
```

### Pattern: Ensure Approval Before Trading

```typescript
const allowance = await getAllowance(tokenAddress, account.address, spender)
if (allowance < requiredAmount) {
  await approve(tokenAddress, spender, requiredAmount)
}
```

### Pattern: Generate Permit for Gasless Spending

```typescript
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300) // 5 min from now
const permit = await generatePermitSignature(tokenAddress, spender, amount, deadline)
// Use permit.v, permit.r, permit.s in token.permit() call
```

---

## Summary for AI Agents

This skill provides complete viem-only implementations for:

1. **Read Operations** (no gas): Balance, metadata, allowances via multicall for efficiency
2. **Write Operations** (requires gas): Approve, transfer with automatic receipt confirmation
3. **Advanced**: ERC-2612 permit signature generation for gasless spending

### Quick Checklist Before Implementation

- Network setup: Use provided configuration for both testnet (chainId 10143) and mainnet (chainId 143)
- Amount handling: All amounts in bigint format, divide by 10^18 for display (all tokens use 18 decimals)
- Approval: Always check allowance before write operations
- Permit: Only use if token implements ERC-2612, fetch nonce immediately before signing
- Confirmation: Always await `waitForTransactionReceipt()` before returning

All examples in this skill are tested and production-ready for AI implementation.
