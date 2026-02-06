# RPC Reference

## Endpoints

| Type      | Mainnet                           | Testnet                          |
| --------- | --------------------------------- | -------------------------------- |
| HTTP      | `https://mainnet.megaeth.com/rpc` | `https://carrot.megaeth.com/rpc` |
| WebSocket | `wss://mainnet.megaeth.com/ws`    | `wss://carrot.megaeth.com/ws`    |

Third-party providers: Alchemy, QuickNode (recommended for geo-distributed access)

## MegaETH-Specific Methods

### Instant Transaction Receipts

MegaETH supports synchronous transaction submission — get your receipt in <10ms instead of polling.

**Two equivalent methods:**

| Method                        | Origin            | Status              |
| ----------------------------- | ----------------- | ------------------- |
| `realtime_sendRawTransaction` | MegaETH original  | Supported           |
| `eth_sendRawTransactionSync`  | EIP-7966 standard | Supported (proxied) |

**History:** MegaETH created `realtime_sendRawTransaction` first. Later, `eth_sendRawTransactionSync` was standardized as EIP-7966. MegaETH now proxies both — they are functionally identical. Use whichever you prefer; `eth_sendRawTransactionSync` is recommended for cross-chain compatibility.

```bash
# Both work identically:
curl -X POST https://mainnet.megaeth.com/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_sendRawTransactionSync",
    "params": ["0x...signedTx"],
    "id": 1
  }'

# Or use the original:
curl -X POST https://mainnet.megaeth.com/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "realtime_sendRawTransaction",
    "params": ["0x...signedTx"],
    "id": 1
  }'
```

**Response:** Full transaction receipt (same schema as `eth_getTransactionReceipt`)

**Corner cases on retry:**

- Tx still in pool: "already known" error
- Tx already executed: "nonce too low" error (future: will return receipt directly)

### eth_getLogsWithCursor

Paginated log queries for large result sets:

```javascript
const response = await client.request({
  method: 'eth_getLogsWithCursor',
  params: [
    {
      address: '0x...',
      topics: ['0x...'],
      fromBlock: '0x0',
      toBlock: 'latest',
    },
  ],
})
// Returns { logs: [...], cursor: "..." }
// Use cursor in next request to continue
```

### Mini-Block Subscription

```javascript
{
  "jsonrpc": "2.0",
  "method": "eth_subscribe",
  "params": ["miniBlocks"],
  "id": 1
}
```

**Mini-block schema:**

```json
{
  "payload_id": "0x...",
  "block_number": 12345,
  "index": 0,
  "tx_offset": 0,
  "log_offset": 0,
  "gas_offset": 0,
  "timestamp": 1704067200000,
  "gas_used": 21000,
  "transactions": [...],
  "receipts": [...]
}
```

Mini-blocks are ephemeral — cannot be fetched via RPC after assembly into blocks.

## WebSocket Guidelines

### Keepalive Required

Send `eth_chainId` every 30 seconds to prevent disconnection:

```javascript
const ws = new WebSocket('wss://mainnet.megaeth.com/ws')

const keepalive = setInterval(() => {
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: Date.now(),
    }),
  )
}, 30000)

ws.on('close', () => clearInterval(keepalive))
```

### Limits

- 50 WebSocket connections per VIP endpoint
- 10 subscriptions per connection (+1 on subscribe, -1 on unsubscribe)

### Supported Methods on WS

- `eth_sendRawTransaction`
- `eth_sendRawTransactionSync`
- `eth_subscribe` / `eth_unsubscribe`
- `eth_chainId` (for keepalive)

## Batching eth_call Requests (v2.0.14+)

As of v2.0.14, **Multicall is the preferred approach** for batching `eth_call` requests.

### Why Multicall?

With v2.0.14, `eth_call` is 2-10x faster. The EVM execution time is now a small fraction of total CPU time — most overhead is per-RPC framework cost. Multicall amortizes this overhead across multiple calls.

```typescript
// ✅ Preferred: Multicall (v2.0.14+)
import { multicall } from 'viem/actions'

const results = await multicall(client, {
  contracts: [
    { address: token1, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: token2, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: token3, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
  ],
})
```

### Historical Context

Earlier MegaETH guidance recommended JSON-RPC batching over Multicall because:

- Multicall made it difficult to cache `eth_call` results effectively
- Certain dApps benefited significantly from this caching

With v2.0.14's performance improvements, the caching mechanism is deprecated and Multicall is now preferred.

### Still Avoid

- **Mixing slow + fast methods** — Don't batch `eth_getLogs` with `eth_call`; logs are always slower
- **Blocking UX on historical queries** — Keep `eth_getLogs` in background

## Rate Limiting

Public endpoints have rate limits based on:

- CPU time consumption
- Network bandwidth (32 MB/s average, 15x burst for VIP)

### Methods Vulnerable to Abuse

These require VIP endpoints for heavy usage:

- `eth_getLogs` (large block ranges)
- `eth_call` (complex contracts)
- `debug_*` / `trace_*` (disabled on public)

### Best Practices

1. **Warm up connections** — Call `eth_chainId` on app init to pre-establish HTTP connection (avoids DNS/TCP/TLS overhead on first real request)
2. **Use Multicall for eth_call batching** — Amortizes per-RPC overhead (v2.0.14+)
3. **Don't batch slow with fast** — `eth_getLogs` blocks entire batch response
4. **Use cursors** — `eth_getLogsWithCursor` instead of huge `eth_getLogs`
5. **Background historical queries** — Never block UX waiting for logs

## eth_getLogs Limits

- Multi-block queries: max 20,000 logs per call
- Single-block queries: no limit
- Workaround: Get headers first to count logs, then build queries accordingly

## Historical Data

Public endpoint supports `eth_call` on blocks from past ~15 days. For older data:

- Use Alchemy/QuickNode
- Run your own archive node
- Use indexers (Envio HyperSync recommended)

## Latency Optimization

MegaETH's real-time capabilities shine when you optimize for low latency. Here's what matters:

### Benchmarks (West Coast US → Public RPC)

| Method                     | HTTP      | WebSocket     |
| -------------------------- | --------- | ------------- |
| eth_chainId                | 40ms      | **7ms**       |
| eth_getBalance             | 140ms     | ~50ms         |
| eth_sendRawTransactionSync | 200-450ms | **150-300ms** |

WebSocket is **5-6x faster** for simple calls due to persistent connection.

### 1. Use WebSocket Over HTTP

```typescript
// ❌ Slow: HTTP per request (TCP + TLS handshake each time)
const result = await fetch(RPC_URL, { method: 'POST', ... });

// ✅ Fast: Persistent WebSocket connection
const ws = new WebSocket('wss://mainnet.megaeth.com/ws');
ws.send(JSON.stringify({ method: 'eth_sendRawTransactionSync', ... }));
```

### 2. Pre-Sign Transactions

Don't sign in the hot path. Prepare transactions ahead of time:

```typescript
// Pre-sign with sequential nonces
const nonce = await publicClient.getTransactionCount({ address })

const signedTxs = await Promise.all([
  wallet.signTransaction({ ...baseTx, nonce: nonce }),
  wallet.signTransaction({ ...baseTx, nonce: nonce + 1 }),
  wallet.signTransaction({ ...baseTx, nonce: nonce + 2 }),
])

// Later: fire instantly when needed
const receipt = await rpc('eth_sendRawTransactionSync', [signedTxs[0]])
```

### 3. Nonce Pipelining

Don't wait for confirmations between transactions:

```typescript
// ❌ Slow: Wait for each confirmation
for (const tx of transactions) {
  const receipt = await sendAndWait(tx)
}

// ✅ Fast: Pipeline with sequential nonces
let nonce = await getNonce(address)
const receipts = await Promise.all(
  transactions.map((tx, i) =>
    rpc('eth_sendRawTransactionSync', [signTx({ ...tx, nonce: nonce + i })]),
  ),
)
```

### 4. HTTP Keep-Alive

If using HTTP, ensure connection reuse:

```typescript
import https from 'https';

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
});

// Reuse for all requests
fetch(RPC_URL, { agent, ... });
```

### 5. Geographic Proximity

| Setup               | Latency       |
| ------------------- | ------------- |
| Cross-continent     | 150-300ms RTT |
| Same region (cloud) | 20-50ms RTT   |
| Local node          | **<5ms RTT**  |

For ultra-low latency:

- Use Alchemy/QuickNode geo-distributed endpoints
- Run your own node in the same datacenter as your app

### 6. Batch RPC Calls

```typescript
// ❌ Slow: 3 sequential calls = 3x latency
const a = await rpc('eth_call', [params1])
const b = await rpc('eth_call', [params2])
const c = await rpc('eth_call', [params3])

// ✅ Fast: Single batch = 1x latency
const [a, b, c] = await fetch(RPC_URL, {
  body: JSON.stringify([
    { method: 'eth_call', params: [params1], id: 1 },
    { method: 'eth_call', params: [params2], id: 2 },
    { method: 'eth_call', params: [params3], id: 3 },
  ]),
})
```

### Theoretical Minimum Latency

With optimal setup (local node + WebSocket + pre-signed):

- Sign: ~1ms (pre-computed)
- Network to local node: ~1ms
- MegaETH processing: ~10ms
- **Total: ~12ms**

## Debugging Commands

```bash
# Estimate gas
cast estimate \
  --from 0xYourAddress \
  --value 0.001ether \
  0xRecipient \
  --rpc-url https://mainnet.megaeth.com/rpc

# Get balance at block
cast call --block 12345 0xContract "balanceOf(address)(uint256)" 0xAddress \
  --rpc-url https://mainnet.megaeth.com/rpc

# Trace transaction (requires VIP or local node)
cast run <txhash> --rpc-url <vip-endpoint>
```
