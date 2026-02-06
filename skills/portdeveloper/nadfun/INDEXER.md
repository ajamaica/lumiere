# INDEXER.md - Historical Event Querying

**Query past bonding curve trades and DEX swaps using viem's RPC-based indexing. No WebSocket needed.**

**Note**: All ABI definitions previously found in this document have been centralized in `ABI.md` for better organization and consistency. Please refer to `ABI.md` for the complete ABI structures.

## Quick Start

```typescript
import { createPublicClient, http, Address } from 'viem'
import { monadTestnet } from 'viem/chains'

// Assume ABIs are globally available or imported from ABI.md if it were a .ts file
// For documentation purposes, we will refer to them by name directly.
declare const curveAbi: any
declare const uniswapV3PoolAbi: any
declare const uniswapV3FactoryAbi: any

// Setup client
const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://monad-testnet.drpc.org'),
})

// Contract addresses
const CURVE_ADDRESS = '0xYourCurveAddress' as Address

// Query historical events
const logs = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

logs.forEach((log) => {
  console.log(`Buy event at block ${log.blockNumber}`)
  console.log(`Sender: ${log.args.sender}`)
  console.log(`Amount In: ${log.args.amountIn}`)
  console.log(`Amount Out: ${log.args.amountOut}`)
})
```

---

### Query All Events with Filters

```typescript
// Get all buy events for a specific token
const buys = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

// Get all sell events for a specific token
const sells = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveSell',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})
```

**Parameters:**

- `address`: Bonding curve contract address
- `abi`: Event ABI definitions
- `eventName`: Specific event to query
- `fromBlock`: Start block (required)
- `toBlock`: End block (required)
- `args`: Event argument filters (optional)

**Returns:** Array of event logs with decoded arguments

---

### Query by Event Type

```typescript
// Get all token creations
const creates = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveCreate',
  fromBlock: 1000000n,
  toBlock: 1001000n,
})

// Get all buys for a specific token
const buys = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

// Get all sells for a specific token
const sells = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveSell',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

// Get all sync events
const syncs = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveSync',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

// Get all token locks
const locks = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveTokenLocked',
  fromBlock: 1000000n,
  toBlock: 1001000n,
})

// Get all graduations
const graduates = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveGraduate',
  fromBlock: 1000000n,
  toBlock: 1001000n,
})
```

---

### Get Latest Block

```typescript
const latestBlock = await publicClient.getBlockNumber()
console.log('Current block:', latestBlock)

// Safe query: lag 10 blocks behind latest to avoid reorgs
const safeToBlock = latestBlock - 10n
```

---

## Event Types (Curve)

### CurveCreate Events

Event data structure:

```typescript
{
  eventName: 'CurveCreate'
  args: {
    creator: Address
    token: Address
    pool: Address
    name: string
    symbol: string
    tokenURI: string
    virtualMon: bigint
    virtualToken: bigint
    targetTokenAmount: bigint
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

**Query:**

```typescript
const creates = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveCreate',
  fromBlock: 1000000n,
  toBlock: 1001000n,
})

creates.forEach((event) => {
  console.log(`New token: ${event.args.name} (${event.args.symbol})`)
  console.log(`Creator: ${event.args.creator}`)
  console.log(`Token address: ${event.args.token}`)
})
```

---

### CurveBuy Events

Event data structure:

```typescript
{
  eventName: 'CurveBuy'
  args: {
    sender: Address
    token: Address
    amountIn: bigint
    amountOut: bigint
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

**Query:**

```typescript
const buys = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: '0xTokenAddress',
  },
})

let totalBuyVolume = 0n
buys.forEach((event) => {
  totalBuyVolume += event.args.amountIn
})
console.log(`Total buy volume: ${totalBuyVolume} wei`)
```

---

### CurveSell Events

Event data structure:

```typescript
{
  eventName: 'CurveSell'
  args: {
    sender: Address
    token: Address
    amountIn: bigint
    amountOut: bigint
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

---

### CurveSync Events

Emitted whenever reserves update.

```typescript
{
  eventName: 'CurveSync'
  args: {
    token: Address
    realMonReserve: bigint
    realTokenReserve: bigint
    virtualMonReserve: bigint
    virtualTokenReserve: bigint
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

---

### CurveTokenLocked Events

```typescript
{
  eventName: 'CurveTokenLocked'
  args: {
    token: Address
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

---

### CurveGraduate Events

```typescript
{
  eventName: 'CurveGraduate'
  args: {
    token: Address
    pool: Address
  }
  blockNumber: bigint
  transactionHash: `0x${string}`
  logIndex: number
}
```

---

## DEX Indexer - Uniswap V3 History

Query historical swaps on Uniswap V3 pools (after graduation).

---

### Query Swap Events

```typescript
const POOL_ADDRESS = '0xYourPoolAddress' as Address

const swaps = await publicClient.getContractEvents({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  eventName: 'Swap',
  fromBlock: 1000000n,
  toBlock: 1001000n,
})

swaps.forEach((event) => {
  console.log(`Sender: ${event.args.sender}`)
  console.log(`Recipient: ${event.args.recipient}`)
  console.log(`Amount 0: ${event.args.amount0.toString()}`)
  console.log(`Amount 1: ${event.args.amount1.toString()}`)
  console.log(`Tick: ${event.args.tick}`)
})
```

**Filter by sender or recipient:**

```typescript
const swaps = await publicClient.getContractEvents({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  eventName: 'Swap',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    sender: '0xSenderAddress',
  },
})
```

---

### Get Pool Info

```typescript
// Get token addresses
const token0 = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  functionName: 'token0',
})

const token1 = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  functionName: 'token1',
})

// Get fee
const fee = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  functionName: 'fee',
})

// Get liquidity
const liquidity = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  functionName: 'liquidity',
})

// Get current price and tick
const slot0 = await publicClient.readContract({
  address: POOL_ADDRESS,
  abi: uniswapV3PoolAbi,
  functionName: 'slot0',
})

console.log('Token 0:', token0)
console.log('Token 1:', token1)
console.log('Fee:', fee, 'bps')
console.log('Liquidity:', liquidity)
console.log('Current tick:', slot0[1])
console.log('Sqrt Price X96:', slot0[0])
```

---

## Pool Discovery

Find Uniswap V3 pools for tokens using the Uniswap V3 Factory.

### Discover Pool for Token

```typescript
import { zeroAddress } from 'viem'

// Testnet addresses
const FACTORY_ADDRESS = '0xYourFactoryAddress' as Address
const WMON_ADDRESS = '0xYourWMONAddress' as Address

async function discoverPoolForToken(
  tokenAddress: Address,
  feeOptions: number[] = [500, 3000, 10000], // Standard Uniswap fee tiers
): Promise<Address | null> {
  for (const fee of feeOptions) {
    const pool = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: uniswapV3FactoryAbi,
      functionName: 'getPool',
      args: [tokenAddress, WMON_ADDRESS, fee],
    })

    if (pool !== zeroAddress) {
      console.log(`Found pool at ${pool} with fee ${fee}`)
      return pool
    }
  }

  return null
}

// Usage
const pool = await discoverPoolForToken('0xTokenAddress')
```

---

## Complete Examples

### Example 1: Token Analytics

```typescript
import { createPublicClient, http, Address, formatEther } from 'viem'
import { monadTestnet } from 'viem/chains'

async function analyzeToken(tokenAddress: Address) {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })

  const CURVE_ADDRESS = '0xYourCurveAddress' as Address

  // Get latest block
  const latest = await publicClient.getBlockNumber()
  const fromBlock = latest - 10000n // Last 10k blocks

  // Query all buy events
  const buys = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveBuy',
    fromBlock,
    toBlock: latest,
    args: {
      token: tokenAddress,
    },
  })

  // Query all sell events
  const sells = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveSell',
    fromBlock,
    toBlock: latest,
    args: {
      token: tokenAddress,
    },
  })

  // Query create events
  const creates = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveCreate',
    fromBlock,
    toBlock: latest,
    args: {
      token: tokenAddress,
    },
  })

  // Analyze data
  let totalBuyVolume = 0n
  let totalSellVolume = 0n
  const buyers = new Set<Address>()
  const sellers = new Set<Address>()

  buys.forEach((event) => {
    totalBuyVolume += event.args.amountIn
    buyers.add(event.args.sender)
  })

  sells.forEach((event) => {
    totalSellVolume += event.args.amountIn
    sellers.add(event.args.sender)
  })

  // Print report
  console.log('=== Token Analytics ===')
  console.log(`Token: ${tokenAddress}`)
  console.log(`Blocks analyzed: ${fromBlock} - ${latest}`)
  console.log('')
  console.log('Events:')
  console.log(`  Creates: ${creates.length}`)
  console.log(`  Buys: ${buys.length}`)
  console.log(`  Sells: ${sells.length}`)
  console.log('')
  console.log('Volume:')
  console.log(`  Buy volume: ${formatEther(totalBuyVolume)} MON`)
  console.log(`  Sell volume: ${formatEther(totalSellVolume)} MON`)
  console.log('')
  console.log('Participation:')
  console.log(`  Unique buyers: ${buyers.size}`)
  console.log(`  Unique sellers: ${sellers.size}`)

  return {
    creates: creates.length,
    buys: buys.length,
    sells: sells.length,
    buyVolume: totalBuyVolume,
    sellVolume: totalSellVolume,
    buyers: buyers.size,
    sellers: sellers.size,
  }
}

analyzeToken('0x...').catch(console.error)
```

---

### Example 2: Find Whales

```typescript
import { parseEther } from 'viem'

async function findWhales(tokenAddress: Address, threshold: string = '1') {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })

  const CURVE_ADDRESS = '0xYourCurveAddress' as Address

  const latest = await publicClient.getBlockNumber()
  const fromBlock = latest - 50000n

  const buys = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveBuy',
    fromBlock,
    toBlock: latest,
    args: {
      token: tokenAddress,
    },
  })

  // Find large buys
  const thresholdWei = parseEther(threshold)
  const whales = buys.filter((buy) => buy.args.amountIn >= thresholdWei)

  console.log(`=== Whales (>${threshold} MON) ===`)
  whales.forEach((whale) => {
    console.log(`${whale.args.sender}`)
    console.log(`  Spent: ${formatEther(whale.args.amountIn)} MON`)
    console.log(`  Got: ${formatEther(whale.args.amountOut)} tokens`)
    console.log(`  Block: ${whale.blockNumber}`)
    console.log(`  TX: ${whale.transactionHash}`)
    console.log('')
  })

  return whales
}

findWhales('0x...', '0.5').catch(console.error)
```

---

### Example 3: Track Token Graduation

```typescript
async function findGraduation(tokenAddress: Address) {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })

  const CURVE_ADDRESS = '0xYourCurveAddress' as Address

  const latest = await publicClient.getBlockNumber()

  // Query recent blocks for graduation event
  const events = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveGraduate',
    fromBlock: latest - 10000n,
    toBlock: latest,
  })

  const graduation = events.find((e) => e.args.token === tokenAddress)

  if (graduation) {
    console.log(`Token graduated!`)
    console.log(`Block: ${graduation.blockNumber}`)
    console.log(`TX: ${graduation.transactionHash}`)
    console.log(`New V3 Pool: ${graduation.args.pool}`)
    return graduation
  } else {
    console.log(`Token not yet graduated`)
    return null
  }
}

findGraduation('0x...').catch(console.error)
```

---

### Example 4: DEX Activity

```typescript
async function getDexActivity(tokenAddress: Address) {
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://monad-testnet.drpc.org'),
  })

  const CURVE_ADDRESS = '0xYourCurveAddress' as Address
  const FACTORY_ADDRESS = '0xYourFactoryAddress' as Address
  const WMON_ADDRESS = '0xYourWMONAddress' as Address

  // Find pool
  const pool = await discoverPoolForToken(tokenAddress)

  if (!pool) {
    console.log('Token not on DEX')
    return
  }

  console.log(`Pool: ${pool}`)

  // Get latest block
  const latest = await publicClient.getBlockNumber()

  // Query swaps
  const swaps = await publicClient.getContractEvents({
    address: pool,
    abi: uniswapV3PoolAbi,
    eventName: 'Swap',
    fromBlock: latest - 1000n,
    toBlock: latest,
  })

  console.log(`\n=== Recent Swaps ===`)
  console.log(`Total swaps: ${swaps.length}`)

  let totalAmount0 = 0n
  let totalAmount1 = 0n

  swaps.forEach((swap) => {
    totalAmount0 += swap.args.amount0
    totalAmount1 += swap.args.amount1
  })

  console.log(`Total amount0: ${totalAmount0.toString()}`)
  console.log(`Total amount1: ${totalAmount1.toString()}`)
  if (swaps.length > 0) {
    console.log(`Current tick: ${swaps[swaps.length - 1].args.tick}`)
  }
}

getDexActivity('0x...').catch(console.error)
```

---

## Block Range Query Tips

### Recent Activity (Last Hour)

```typescript
// Assuming ~1 block per second on Monad
const latest = await publicClient.getBlockNumber()
const oneHourAgo = latest - 3600n

const recentEvents = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: oneHourAgo,
  toBlock: latest,
})
```

### Safe Lag Behind Latest

```typescript
const latest = await publicClient.getBlockNumber()
const SAFE_LAG = 10n // Avoid reorgs

const safeToBlock = latest - SAFE_LAG
const fromBlock = safeToBlock - 10000n

const events = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock,
  toBlock: safeToBlock,
})
```

### Paginate Large Block Ranges

```typescript
async function queryLargeRange(tokenAddress: Address, blockRange: bigint) {
  const latest = await publicClient.getBlockNumber()

  const allEvents = []
  const CHUNK = 10000n

  for (let from = latest - blockRange; from < latest; from += CHUNK) {
    const to = from + CHUNK > latest ? latest : from + CHUNK
    const events = await publicClient.getContractEvents({
      address: CURVE_ADDRESS,
      abi: curveAbi,
      eventName: 'CurveBuy',
      fromBlock: from,
      toBlock: to,
      args: {
        token: tokenAddress,
      },
    })
    allEvents.push(...events)
  }

  return allEvents
}
```

---

## Performance Tips

### Use Specific Event Filters

```typescript
// Fast: specific event query
const buys = await publicClient.getContractEvents({
  address: CURVE_ADDRESS,
  abi: curveAbi,
  eventName: 'CurveBuy',
  fromBlock: 1000000n,
  toBlock: 1001000n,
  args: {
    token: tokenAddress,
  },
})

// Slower: get all logs then filter manually
const allLogs = await publicClient.getLogs({
  address: CURVE_ADDRESS,
  fromBlock: 1000000n,
  toBlock: 1001000n,
})
```

### Cache Results

```typescript
const eventCache = new Map<string, any[]>()

async function getCachedEvents(token: Address, from: bigint, to: bigint) {
  const key = `${token}-${from}-${to}`
  if (eventCache.has(key)) {
    return eventCache.get(key)!
  }

  const events = await publicClient.getContractEvents({
    address: CURVE_ADDRESS,
    abi: curveAbi,
    eventName: 'CurveBuy',
    fromBlock: from,
    toBlock: to,
    args: {
      token,
    },
  })

  eventCache.set(key, events)
  return events
}
```

### Limit Block Range

Don't query millions of blocks at once. Use reasonable ranges (10k-50k blocks) and paginate if needed.

---

## Common Use Cases

- "Find all trades on token X in the last 1000 blocks" → Use `getContractEvents` with `CurveBuy` and `CurveSell`
- "When did token X graduate to DEX?" → Query `Graduate` events
- "Get buy volume for token X" → Sum `amountIn` from `CurveBuy` events
- "Find whale buys (>1 MON) on token X" → Filter `CurveBuy` events by `amountIn`
- "Analyze total volume and participant count for token X" → Query all events, aggregate data
- "Get DEX swap activity after token X graduated" → Use Uniswap pool's `Swap` events
- "Find all token creations in the last 100 blocks" → Query `CurveCreate` events
- "Track the price progression from creation to graduation" → Analyze sequential `CurveSync` events
