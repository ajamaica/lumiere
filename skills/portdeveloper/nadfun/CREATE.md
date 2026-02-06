# Token Creation Skill (CREATE)

Complete guide to creating tokens on nad.fun using pure viem and direct API calls. Supports testnet and mainnet networks.

**Note**: All ABI definitions previously found in this document have been centralized in `ABI.md` for better organization and consistency. Please refer to `ABI.md` for the complete ABI structures.

## Quick Start

```typescript
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'
import * as fs from 'fs'

// Assume ABIs are globally available or imported from ABI.md if it were a .ts file
// For documentation purposes, we will refer to them by name directly.
declare const curveAbi: any
declare const bondingCurveRouterAbi: any
declare const lensAbi: any
declare const erc20Abi: any // erc20Abi is also defined in ABI.md, but a minimal version is used here for context where needed
declare const creatorTreasuryAbi: any
```

## Network Configuration

### Testnet (Default)

```typescript
{
  rpcUrl: 'https://monad-testnet.drpc.org',
  apiUrl: 'https://dev-api.nad.fun',
  API_KEY: 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  headers: { 'X-API-Key': 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
}
```

### Mainnet

```typescript
{
  rpcUrl: 'https://monad-mainnet.drpc.org',
  apiUrl: 'https://api.nadapp.net',
  API_KEY: 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  headers: { 'X-API-Key': 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
  chainId: 143,
  CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  BONDING_CURVE_ROUTER: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
  LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
}
```

## Token Creation Flow

Token creation happens in 4 steps. All steps must be executed in order.

### Step 1: Upload Image

Upload token image to NadFun API (NSFW filtered).

**Using fetch:**

```typescript
const API_URL = CONFIG.apiUrl // Use CONFIG.apiUrl

const imageBuffer = fs.readFileSync('./my-token.png')

const imageResponse = await fetch(`${API_URL}/agent/token/image`, {
  method: 'POST',
  headers: {
    'Content-Type': 'image/png',
    'X-API-Key': API_KEY, // Added API key header
  },
  body: imageBuffer,
})

if (!imageResponse.ok) {
  throw new Error(`Image upload failed: ${imageResponse.statusText}`)
}

const imageResult = await imageResponse.json()
// {
//   "image_uri": "ipfs://QmXxxx...",
//   "is_nsfw": false
// }

console.log('Image URI:', imageResult.image_uri)
console.log('NSFW detected:', imageResult.is_nsfw)
```

**Using curl:**

```bash
API_URL="https://dev-api.nad.fun"  # testnet
# API_URL="https://api.nadapp.net"  # mainnet

curl -X POST "${API_URL}/agent/token/image" \
  -H "Content-Type: image/png" \
  -H "X-API-Key: nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --data-binary @my-token.png

# Response:
# {
#   "image_uri": "ipfs://QmXxxx...",
#   "is_nsfw": false
# }
```

**Supported Content Types:**

- `image/png`
- `image/jpeg`
- `image/webp`
- `image/svg+xml`

**Returns:**

- `image_uri` (string): IPFS URI for the uploaded image
- `is_nsfw` (boolean): NSFW flag from content filter

**Error Handling:**

- HTTP 400: Invalid image format
- HTTP 413: Image too large (keep < 5MB)
- HTTP 500: API service error

---

### Step 2: Upload Metadata

Create JSON metadata with token info and image reference.

**Using fetch:**

```typescript
const metadataResponse = await fetch(`${API_URL}/agent/token/metadata`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY, // Added API key header
  },
  body: JSON.stringify({
    image_uri: imageResult.image_uri,
    name: 'My Token',
    symbol: 'MTK',
    description: 'Token description',
    website: 'https://mytoken.com',
    twitter: 'https://x.com/mytoken',
    telegram: 'https://t.me/mytoken',
  }),
})

if (!metadataResponse.ok) {
  throw new Error(`Metadata upload failed: ${metadataResponse.statusText}`)
}

const metadataResult = await metadataResponse.json()
// {
//   "metadata_uri": "ipfs://QmYyyy...",
//   "metadata": {
//     "name": "My Token",
//     "symbol": "MTK",
//     "description": "Token description",
//     "image_uri": "ipfs://QmXxxx...",
//     "website": "https://mytoken.com",
//     "twitter": "https://x.com/mytoken",
//     "telegram": "https://t.me/mytoken",
//     "is_nsfw": false
//   }
// }

console.log('Metadata URI:', metadataResult.metadata_uri)
```

**Using curl:**

```bash
API_URL="https://dev-api.nad.fun"  # testnet

curl -X POST "${API_URL}/agent/token/metadata" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "image_uri": "ipfs://QmXxxx...",
    "name": "My Token",
    "symbol": "MTK",
    "description": "Token description",
    "website": "https://mytoken.com",
    "twitter": "https://x.com/mytoken",
    "telegram": "https://t.me/mytoken"
  }'
```

**Request Parameters:**

- `image_uri` (string, required): IPFS URI from Step 1
- `name` (string, required): Token name
- `symbol` (string, required): Token symbol
- `description` (string, required): Token description
- `website` (string, optional): Website URL
- `twitter` (string, optional): Twitter/X URL
- `telegram` (string, optional): Telegram group URL

**Response:**

- `metadata_uri` (string): IPFS URI for metadata
- `metadata` (object): Echo of submitted metadata with `is_nsfw` flag

**Error Handling:**

- HTTP 400: Missing required field or validation error
- HTTP 500: API service error

---

### Step 3: Mine Salt (Vanity Address)

Mine a salt value to predict token address before creation. This is computationally expensive on the API side.

**Using fetch:**

```typescript
const saltResponse = await fetch(`${API_URL}/agent/salt`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY, // Added API key header
  },
  body: JSON.stringify({
    creator: account.address,
    name: 'My Token',
    symbol: 'MTK',
    metadata_uri: metadataResult.metadata_uri,
  }),
})

if (!saltResponse.ok) {
  throw new Error(`Salt mining failed: ${saltResponse.statusText}`)
}

const saltResult = await saltResponse.json()
// {
//   "salt": "0x...",
//   "address": "0x1234567890123456789012345678901234567890"
// }

console.log('Predicted token address:', saltResult.address)
console.log('Salt:', saltResult.salt)
```

**Using curl:**

```bash
API_URL="https://dev-api.nad.fun"  # testnet
CREATOR="0x1234567890123456789012345678901234567890"

curl -X POST "${API_URL}/agent/salt" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{
    "creator": "'$CREATOR'",
    "name": "My Token",
    "symbol": "MTK",
    "metadata_uri": "ipfs://QmYyyy..."
  }'

# Response:
# {
#   "salt": "0x...",
#   "address": "0x1234567890123456789012345678901234567890"
# }
```

**Request Parameters:**

- `creator` (address, required): Creator/caller address
- `name` (string, required): Token name (must match contract call)
- `symbol` (string, required): Token symbol (must match contract call)
- `metadata_uri` (string, required): Metadata URI from Step 2

**Response:**

- `salt` (hex string): Bytes32 salt for CREATE2 deterministic address
- `address` (address): Predicted token address

**Error Handling:**

- HTTP 400: Invalid address format or missing field
- HTTP 500: API service error
- Note: Mining can take 5-30 seconds depending on luck

---

### Step 4: Create Token On-Chain

Call BONDING_CURVE_ROUTER.create() to deploy token and initialize bonding curve pool.

**Complete Example with viem:**

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  decodeEventLog,
  type Hex,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'

// ABIs are defined centrally in ABI.md

// Network config
const CURVE = '0x1228b0dc9481C11D3071E7A924B794CfB038994e' as const
const BONDING_CURVE_ROUTER = '0x865054F0F6A288adaAc30261731361EA7E908003' as const
const LENS = '0xB056d79CA5257589692699a46623F901a3BB76f1' as const

// Setup clients
const account = privateKeyToAccount('0x...')
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://monad-testnet.drpc.org'),
})
const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http('https://monad-testnet.drpc.org'),
})

// Step 1: Get deploy fee
const feeConfig = await publicClient.readContract({
  address: CURVE,
  abi: curveAbi,
  functionName: 'feeConfig',
})
const deployFeeAmount = feeConfig[0]

console.log('Deploy fee:', formatEther(deployFeeAmount), 'MON')

// Step 2: Calculate total value
const initialBuyAmount = parseEther('0.1') // Optional: set to 0n for no initial buy
const totalValue = deployFeeAmount + initialBuyAmount

// Step 3: Get expected tokens from initial buy (if applicable)
let minTokens = 0n
if (initialBuyAmount > 0n) {
  minTokens = await publicClient.readContract({
    address: LENS,
    abi: lensAbi,
    functionName: 'getInitialBuyAmountOut',
    args: [initialBuyAmount],
  })
  console.log('Expected tokens:', formatEther(minTokens))
}

// Step 4: Call create function
const hash = await walletClient.writeContract({
  address: BONDING_CURVE_ROUTER,
  abi: bondingCurveRouterAbi,
  functionName: 'create',
  args: [
    {
      name: 'My Token',
      symbol: 'MTK',
      tokenURI: metadataResult.metadata_uri, // From Step 2
      amountOut: minTokens,
      salt: saltResult.salt as `0x${string}`, // From Step 3
      actionId: 1,
    },
  ],
  account,
  chain: monadTestnet,
  value: totalValue,
  gas: 5000000n,
})

console.log('Transaction hash:', hash)

// Step 5: Wait for receipt
const receipt = await publicClient.waitForTransactionReceipt({ hash })

// Step 6: Decode CurveCreate event
let tokenAddress: Address = '0x0000000000000000000000000000000000000000'
let poolAddress: Address = '0x0000000000000000000000000000000000000000'

for (const log of receipt.logs) {
  try {
    const event = decodeEventLog({
      abi: curveAbi,
      data: log.data,
      topics: log.topics,
    })
    if (event.eventName === 'CurveCreate') {
      tokenAddress = event.args.token
      poolAddress = event.args.pool
      break
    }
  } catch {
    // Not a CurveCreate event, continue
  }
}

console.log('Token created:', tokenAddress)
console.log('Pool created:', poolAddress)
```

**Return Type:**

```typescript
interface CreateTokenResult {
  tokenAddress: Address
  poolAddress: Address
  transactionHash: Hex
  imageUri: string
  metadataUri: string
  salt: `0x${string}`
  isNsfw: boolean
}
```

**Fees & Gas:**

- Deploy fee: From `feeConfig.deployFeeAmount`
- Initial buy: Optional MON amount
- Gas estimate: 5 million gas recommended
- Total value: `deployFeeAmount + initialBuyAmount`

---

---

## Get Fee Config

Check current deployment fees before creating token.

```typescript
const feeConfig = await publicClient.readContract({
  address: CURVE,
  abi: curveAbi,
  functionName: 'feeConfig',
})

const deployFeeAmount = feeConfig[0]
const graduateFeeAmount = feeConfig[1]
const protocolFee = feeConfig[2]

console.log('Deploy fee:', formatEther(deployFeeAmount), 'MON')
console.log('Graduate fee:', formatEther(graduateFeeAmount), 'MON')
console.log('Protocol fee:', protocolFee, 'bps')
```

**Returns:**

- `deployFeeAmount`: MON required to create token
- `graduateFeeAmount`: MON fee when token graduates
- `protocolFee`: Protocol fee in basis points

---

## Complete Example: Full Token Launch

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  decodeEventLog,
  type Hex,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'
import * as fs from 'fs'

// ABIs are defined centrally in ABI.md

// Config
const API_URL = 'https://dev-api.nad.fun'
const API_KEY = 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
const headers = { 'X-API-Key': API_KEY }
const CURVE = '0x1228b0dc9481C11D3071E7A924B794CfB038994e' as const
const BONDING_CURVE_ROUTER = '0x865054F0F6A288adaAc30261731361EA7E908003' as const
const LENS = '0xB056d79CA5257589692699a46623F901a3BB76f1' as const

async function launchToken() {
  // Setup
  const account = privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`)
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })

  console.log('Wallet:', account.address)
  console.log('')

  // Check fees
  console.log('=== Checking Fees ===')
  const feeConfig = await publicClient.readContract({
    address: CURVE,
    abi: curveAbi,
    functionName: 'feeConfig',
  })
  const deployFeeAmount = feeConfig[0]
  console.log(`Deploy fee: ${formatEther(deployFeeAmount)} MON`)
  console.log('')

  // Load image
  console.log('=== Loading Image ===')
  const imageBuffer = fs.readFileSync('./token-image.png')
  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`)
  console.log('')

  // Step 1: Upload image
  console.log('=== Step 1: Upload Image ===')
  const imageResponse = await fetch(`${API_URL}/agent/token/image`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png' },
    body: imageBuffer,
  })
  if (!imageResponse.ok) {
    throw new Error(`Image upload failed: ${imageResponse.statusText}`)
  }
  const imageResult = await imageResponse.json()
  console.log('Image URI:', imageResult.image_uri)
  console.log('')

  // Step 2: Upload metadata
  console.log('=== Step 2: Upload Metadata ===')
  const metadataResponse = await fetch(`${API_URL}/agent/token/metadata`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_uri: imageResult.image_uri,
      name: 'My Awesome Token',
      symbol: 'MAT',
      description: 'The most awesome token on Monad blockchain',
      website: 'https://myawesometoken.com',
      twitter: 'https://x.com/myawesometoken',
      telegram: 'https://t.me/myawesometoken',
    }),
  })
  if (!metadataResponse.ok) {
    throw new Error(`Metadata upload failed: ${metadataResponse.statusText}`)
  }
  const metadataResult = await metadataResponse.json()
  console.log('Metadata URI:', metadataResult.metadata_uri)
  console.log('')

  // Step 3: Mine salt
  console.log('=== Step 3: Mine Salt ===')
  const saltResponse = await fetch(`${API_URL}/agent/salt`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator: account.address,
      name: 'My Awesome Token',
      symbol: 'MAT',
      metadata_uri: metadataResult.metadata_uri,
    }),
  })
  if (!saltResponse.ok) {
    throw new Error(`Salt mining failed: ${saltResponse.statusText}`)
  }
  const saltResult = await saltResponse.json()
  console.log('Salt:', saltResult.salt)
  console.log('Predicted address:', saltResult.address)
  console.log('')

  // Step 4: Create on-chain
  console.log('=== Step 4: Create Token On-Chain ===')

  // Calculate initial buy
  const initialBuyAmount = parseEther('0.5')
  const totalValue = deployFeeAmount + initialBuyAmount

  let minTokens = 0n
  if (initialBuyAmount > 0n) {
    minTokens = await publicClient.readContract({
      address: LENS,
      abi: lensAbi,
      functionName: 'getInitialBuyAmountOut',
      args: [initialBuyAmount],
    })
    console.log('Expected tokens:', formatEther(minTokens))
  }

  // Create token
  const hash = await walletClient.writeContract({
    address: BONDING_CURVE_ROUTER,
    abi: bondingCurveRouterAbi,
    functionName: 'create',
    args: [
      {
        name: 'My Awesome Token',
        symbol: 'MAT',
        tokenURI: metadataResult.metadata_uri,
        amountOut: minTokens,
        salt: saltResult.salt as `0x${string}`,
        actionId: 1,
      },
    ],
    account,
    chain: monadTestnet,
    value: totalValue,
    gas: 5000000n,
  })

  console.log('Transaction hash:', hash)
  console.log('')

  // Wait for receipt
  console.log('=== Waiting for Confirmation ===')
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Decode event
  let tokenAddress: Address = '0x0000000000000000000000000000000000000000'
  let poolAddress: Address = '0x0000000000000000000000000000000000000000'

  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({
        abi: curveAbi,
        data: log.data,
        topics: log.topics,
      })
      if (event.eventName === 'CurveCreate') {
        tokenAddress = event.args.token
        poolAddress = event.args.pool
        break
      }
    } catch {
      // Continue
    }
  }

  // Display results
  console.log('✓ Token Created!')
  console.log('')
  console.log('=== Results ===')
  console.log('Token Address:', tokenAddress)
  console.log('Pool Address:', poolAddress)
  console.log('Transaction Hash:', hash)
  console.log('Image URI:', imageResult.image_uri)
  console.log('Metadata URI:', metadataResult.metadata_uri)
  console.log('Salt:', saltResult.salt)
  console.log('NSFW Detected:', imageResult.is_nsfw)
  console.log('')

  // Verify on explorer
  const explorerUrl = `https://monadvision.com/tx/${hash}`
  console.log('View on Explorer:', explorerUrl)
}

launchToken().catch(console.error)
```

---

## Image Guidelines

### Supported Formats

- PNG (recommended)
- JPEG
- WebP
- SVG

### Best Practices

- **Size**: 500x500 pixels ideal
- **File size**: Keep under 2 MB
- **Format**: PNG with transparency works best
- **Content**: Clear, recognizable design
- **NSFW**: Avoid explicit/inappropriate content

### Optimization

```typescript
import sharp from 'sharp'

// Compress image before upload
const optimized = await sharp('./original-image.png')
  .resize(500, 500, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png({ quality: 80 })
  .toBuffer()

// Use optimized buffer for upload
const imageResponse = await fetch(`${API_URL}/agent/token/image`, {
  method: 'POST',
  headers: { 'Content-Type': 'image/png', 'X-API-Key': API_KEY },
  body: optimized,
})
```

---

## Error Handling & Troubleshooting

### Common Errors

**InsufficientFee**

- Cause: Sent value < deployFeeAmount
- Fix: Ensure `value >= deployFeeAmount + initialBuyAmount`

```typescript
const feeConfig = await publicClient.readContract({
  address: CURVE,
  abi: curveAbi,
  functionName: 'feeConfig',
})
const totalValue = feeConfig[0] + initialBuyAmount
// Verify wallet has sufficient balance
```

**InvalidName / InvalidSymbol**

- Cause: Empty or invalid name/symbol
- Fix: Use non-empty strings, recommended < 32 characters

**ZeroAddress**

- Cause: Invalid creator address
- Fix: Use valid wallet address (e.g., `account.address`)

**API 400 Errors**

- Cause: Invalid image format or missing metadata field
- Fix: Verify image format is supported and all required fields present

**Image Upload Failed**

- Cause: Network error, unsupported format, or file too large
- Check: File format (PNG/JPEG/WEBP/SVG), file size (< 5MB), network connectivity

**Metadata Upload Failed**

- Cause: Missing required fields or invalid IPFS URI
- Check: name, symbol, description all present; image_uri is valid IPFS URI

**Salt Mining Failed**

- Cause: Invalid address format or field mismatch
- Check: creator address format, name/symbol matches metadata, metadata_uri is valid

**Transaction Fails On-Chain**

- Cause: Insufficient gas, invalid nonce, or contract error
- Fix: Increase gasLimit to 5000000n, ensure account has balance

### Error Handling Pattern

```typescript
const headers = { 'X-API-Key': API_KEY }

try {
  // Step 1: Image upload
  const imageResponse = await fetch(`${API_URL}/agent/token/image`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png' },
    body: imageBuffer,
  })
  if (!imageResponse.ok) {
    const errorText = await imageResponse.text()
    throw new Error(`Image upload failed: ${errorText}`)
  }
  const imageResult = await imageResponse.json()

  // Step 2: Metadata upload
  const metadataResponse = await fetch(`${API_URL}/agent/token/metadata`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_uri: imageResult.image_uri,
      name: 'My Token',
      symbol: 'MTK',
      description: 'Token description',
    }),
  })
  if (!metadataResponse.ok) {
    const errorText = await metadataResponse.text()
    throw new Error(`Metadata upload failed: ${errorText}`)
  }
  const metadataResult = await metadataResponse.json()

  // Step 3: Salt mining
  const saltResponse = await fetch(`${API_URL}/agent/salt`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creator: account.address,
      name: 'My Token',
      symbol: 'MTK',
      metadata_uri: metadataResult.metadata_uri,
    }),
  })
  if (!saltResponse.ok) {
    const errorText = await saltResponse.text()
    throw new Error(`Salt mining failed: ${errorText}`)
  }
  const saltResult = await saltResponse.json()

  // Step 4: On-chain creation
  const hash = await walletClient.writeContract({
    address: BONDING_CURVE_ROUTER,
    abi: bondingCurveRouterAbi,
    functionName: 'create',
    args: [
      {
        name: 'My Token',
        symbol: 'MTK',
        tokenURI: metadataResult.metadata_uri,
        amountOut: 0n,
        salt: saltResult.salt as `0x${string}`,
        actionId: 1,
      },
    ],
    account,
    value: deployFeeAmount,
    gas: 5000000n,
  })

  console.log('Token created! TX:', hash)
} catch (error) {
  if (error instanceof Error) {
    console.error('Token creation failed:', error.message)
  }
}
```

### Network-Specific Troubleshooting

**Testnet Issues**

```bash
# Get test MON from faucet
# https://monad-testnet.drpc.org/faucet

# Verify RPC is accessible
curl https://monad-testnet.drpc.org -X POST -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Mainnet Issues**

```bash
# Verify RPC is accessible
curl https://monad-mainnet.drpc.org -X POST -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check contract addresses are correct
# CURVE: 0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE
# BONDING_CURVE_ROUTER: 0x6F6B8F1a20703309951a5127c45B49b1CD981A22
```

---

## Common Patterns

### Check Token After Creation

```typescript
// ERC20 ABI for verification (minimal set for this example)
const erc20MinimalAbi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

// Check token info
const name = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20MinimalAbi,
  functionName: 'name',
})
const symbol = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20MinimalAbi,
  functionName: 'symbol',
})
const totalSupply = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20MinimalAbi,
  functionName: 'totalSupply',
})

console.log(`Created: ${name} (${symbol})`)
console.log(`Total supply: ${formatEther(totalSupply)}`)

// Check your balance
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20MinimalAbi,
  functionName: 'balanceOf',
  args: [account.address],
})
console.log(`Your balance: ${formatEther(balance)}`)
```

### Retry Logic for Network Errors

```typescript
async function createTokenWithRetry(maxRetries = 3) {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Execute all 4 steps
      const imageResult = await uploadImage()
      const metadataResult = await uploadMetadata(imageResult.image_uri)
      const saltResult = await mineSalt(metadataResult.metadata_uri)
      const txHash = await createOnChain(saltResult.salt, metadataResult.metadata_uri)

      return { success: true, txHash }
    } catch (error) {
      lastError = error as Error

      // Don't retry validation errors
      if (
        error instanceof Error &&
        (error.message.includes('Invalid') || error.message.includes('NSFW'))
      ) {
        throw error
      }

      // Retry network errors
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 // Exponential backoff
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError || new Error('Token creation failed')
}
```

---

## Best Practices

### 1. Check Fee Before Creating

```typescript
const feeConfig = await publicClient.readContract({
  address: CURVE,
  abi: curveAbi,
  functionName: 'feeConfig',
})
const deployFeeAmount = feeConfig[0]

const balance = await publicClient.getBalance({
  address: account.address,
})

const totalRequired = deployFeeAmount + initialBuyAmount

if (balance < totalRequired) {
  throw new Error(
    `Insufficient balance. Need ${formatEther(totalRequired)} MON, ` +
      `have ${formatEther(balance)} MON`,
  )
}
```

### 2. Optional Initial Buy

Avoid initial buy if you want minimal cost. Set `initialBuyAmount` to `0n`:

```typescript
const initialBuyAmount = 0n // No initial buy, just deployment fee
const minTokens = 0n

const hash = await walletClient.writeContract({
  address: BONDING_CURVE_ROUTER,
  abi: bondingCurveRouterAbi,
  functionName: 'create',
  args: [
    {
      name: 'My Token',
      symbol: 'MTK',
      tokenURI: metadataUri,
      amountOut: minTokens,
      salt: salt,
      actionId: 1,
    },
  ],
  value: deployFeeAmount, // Only deploy fee, no initial buy
  gas: 5000000n,
})
```

### 3. Validate Image Before Upload

```typescript
// Check file size (API may have limits)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
if (imageBuffer.length > MAX_IMAGE_SIZE) {
  throw new Error('Image too large')
}

// Check format
const supportedFormats = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const contentType = 'image/png' // Determine from file
if (!supportedFormats.includes(contentType)) {
  throw new Error(`Unsupported format: ${contentType}`)
}

// Check image dimensions (optional)
import sharp from 'sharp'
const metadata = await sharp(imageBuffer).metadata()
if (metadata.width && metadata.height) {
  console.log(`Image: ${metadata.width}x${metadata.height}`)
}
```

### 4. Handle Network Timeouts

API calls may take time (salt mining is computationally expensive):

```typescript
// Add timeout for salt mining
const saltPromise = fetch(`${API_URL}/agent/salt`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator: account.address,
    name: 'My Token',
    symbol: 'MTK',
    metadata_uri: metadataUri,
  }),
})

const timeoutPromise = new Promise((_, reject) =>
  setTimeout(
    () => reject(new Error('Salt mining timeout after 60s')),
    60000, // 60 seconds
  ),
)

try {
  const response = await Promise.race([saltPromise, timeoutPromise])
  const result = await response.json()
} catch (error) {
  console.error('Operation timeout:', error.message)
}
```

### 5. Verify Token After Creation

```typescript
// Wait a moment for blockchain confirmation
await new Promise((r) => setTimeout(r, 2000))

// ERC20 ABI for verification
const erc20Abi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

// Verify token was created
const name = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'name',
})
const symbol = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'symbol',
})
const totalSupply = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'totalSupply',
})

console.log(`Created: ${name} (${symbol})`)
console.log(`Total supply: ${formatEther(totalSupply)}`)

// Check you have initial tokens if applicable
if (initialBuyAmount > 0n) {
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  })
  console.log(`Your balance: ${formatEther(balance)}`)
}
```

---

## Common Prompts

- "Launch a token with name X and symbol Y using viem"
- "Create a token with this image (no SDK)"
- "Check token creation fees"
- "Verify my token was created successfully"
- "Show me how to create a token with curl and viem"
- "Walk me through the 4-step token creation flow with fetch and viem"
- "How do I calculate the fee and gas for token creation?"
- "What are the ABIs for token creation?"

---

## Creator Rewards - Claiming with Merkle Proofs

Token creators earn fees from trading activity on their tokens. These fees accumulate in the Creator Treasury contract and can be claimed using Merkle proofs.

### Overview

| Step | Action                  | Source                                         |
| ---- | ----------------------- | ---------------------------------------------- |
| 1    | Check claimable rewards | Agent API (`/agent/token/created/:account_id`) |
| 2    | Claim rewards on-chain  | CreatorTreasury contract (`claim()`)           |

### Contract Addresses:

```typescript
const CREATOR_TREASURY = {
  testnet: '0x24dFf9B68fA36f8400302e2babC3e049eA19459E',
  mainnet: '0x42e75B4B96d7000E7Da1e0c729Cec8d2049B9731',
}
```

### Check Claimable Rewards

First, query the Agent API to get your created tokens and their reward info.

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains' // Assuming this chain context is available

const API_KEY = 'nadfun_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' // Make sure this is set from environment or config
const API_URL = 'https://api.nadapp.net' // mainnet // const API_URL = 'https://dev-api.nad.fun' // testnet

const headers = { 'X-API-Key': API_KEY }

interface RewardInfo {
  amount: string // Total accumulated rewards
  claimed_amount: string // Already claimed amount
  proof: string[] // Merkle proof for claim
  claimable: boolean // Whether claim is possible
}

interface CreatedTokensResponse {
  tokens: Array<{
    token_info: { token_id: string; name: string; symbol: string }
    reward_info: RewardInfo
  }>
  total_count: number
}

async function getClaimableRewards(accountId: Address): Promise<CreatedTokensResponse> {
  const url = new URL(`${API_URL}/agent/token/created/${accountId}`)
  const res = await fetch(url, { headers })
  return res.json()
}

// Example: Check claimable tokens
// const result = await getClaimableRewards(account.address) // Assuming 'account' is defined

// for (const token of result.tokens) {
//   const total = BigInt(token.reward_info.amount)
//   const claimed = BigInt(token.reward_info.claimed_amount)
//   const unclaimed = total - claimed

//   if (token.reward_info.claimable && unclaimed > 0n) {
//     console.log(`Token: ${token.token_info.name} (${token.token_info.symbol})`)
//     console.log(`  Unclaimed: ${formatEther(unclaimed)} MON`)
//     console.log(`  Proof: ${token.reward_info.proof.length} nodes`)
//   }
// }
```

### Claim Rewards On-Chain

Use the CreatorTreasury contract to claim your rewards with the Merkle proof.

```typescript
// Setup for viem clients (assuming monadTestnet/monadMainnet and account are defined as in CREATE.md's setup)
// const account = privateKeyToAccount('0x...')
// const publicClient = createPublicClient({ chain: monadTestnet, transport: http('https://monad-testnet.drpc.org') })
// const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http('https://monad-testnet.drpc.org') })

const CREATOR_TREASURY_ADDRESS = '0x24dFf9B68fA36f8400302e2babC3e049eA19459E' as const // Testnet example

// Claim Example:
async function claimRewards(walletClient: any, publicClient: any, accountAddress: Address) {
  const result = await getClaimableRewards(accountAddress)

  const claimable = result.tokens.filter(
    (t) =>
      t.reward_info.claimable &&
      BigInt(t.reward_info.amount) > BigInt(t.reward_info.claimed_amount),
  )

  if (claimable.length === 0) {
    console.log('No rewards to claim')
    return
  }

  const tokens: Address[] = []
  const amounts: bigint[] = []
  const proofs: Hex[][] = []

  for (const token of claimable) {
    const unclaimed = BigInt(token.reward_info.amount) - BigInt(token.reward_info.claimed_amount)
    tokens.push(token.token_info.token_id as Address)
    amounts.push(unclaimed)
    proofs.push(token.reward_info.proof as Hex[])
    console.log(`Claiming ${formatEther(unclaimed)} MON from ${token.token_info.symbol}`)
  }

  const hash = await walletClient.writeContract({
    address: CREATOR_TREASURY_ADDRESS,
    abi: creatorTreasuryAbi,
    functionName: 'claim',
    args: [tokens, amounts, proofs],
  })

  console.log('Claim TX:', hash)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Claimed successfully! Block:', receipt.blockNumber)
}

// Example usage within a script:
// await claimRewards(walletClient, publicClient, account.address);
```

### Error Handling

| Error                 | Meaning                               |
| --------------------- | ------------------------------------- |
| `InvalidProof`        | Merkle proof verification failed      |
| `AlreadyClaimed`      | Amount already claimed for this proof |
| `NotClaimable`        | Token not eligible for claims yet     |
| `InsufficientBalance` | Treasury has insufficient MON balance |

### Claim Tips

1. **Batch claims**: Claim multiple tokens in one transaction to save gas
2. **Check frequently**: Rewards accumulate from trading fees
3. **Verify proofs**: Always fetch fresh proofs from API before claiming
4. **Gas estimation**: Claim transaction gas varies with number of tokens
