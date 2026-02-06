# Protocol Status

> Last tested: 2026-02-01

## Summary

| Status       | Count | Protocols                                     |
| ------------ | ----- | --------------------------------------------- |
| ✅ Working   | 6     | Jupiter, Raydium, Kamino, Jito, Tensor, Drift |
| 🔑 Needs Key | 1     | Lulo                                          |
| ❌ Broken    | 3     | Orca, Sanctum, some dial.to                   |
| ❓ Untested  | 4     | MarginFi, Meteora, Helius, Magic Eden         |

---

## ✅ Working Protocols

### Jupiter

**Status:** Fully working  
**Endpoint:** `worker.jup.ag`

| Action           | Path                                             | Tested |
| ---------------- | ------------------------------------------------ | ------ |
| Swap             | `/blinks/swap/{FROM}-{TO}`                       | ✅     |
| Swap with amount | `/blinks/swap/{inputMint}/{outputMint}/{amount}` | ✅     |

**Example:**

```bash
solana-toolkit execute "https://worker.jup.ag/blinks/swap/SOL-USDC" --amount=0.1
```

---

### Raydium

**Status:** Fully working  
**Endpoint:** `share.raydium.io`

| Action    | Path                                                         | Tested |
| --------- | ------------------------------------------------------------ | ------ |
| Swap info | `/dialect/actions/swap/info`                                 | ✅     |
| Swap tx   | `/dialect/actions/swap/tx?outputMint={mint}&amount={amount}` | ✅     |

**Example:**

```bash
solana-toolkit execute "https://share.raydium.io/dialect/actions/swap/info"
```

---

### Kamino Finance

**Status:** Fully working  
**Endpoint:** `kamino.dial.to`

| Action              | Path                            | Tested           |
| ------------------- | ------------------------------- | ---------------- |
| Deposit to vault    | `/api/v0/lend/{vault}/deposit`  | ✅               |
| Withdraw from vault | `/api/v0/lend/{vault}/withdraw` | ✅               |
| Borrow              | `/api/v0/borrow/...`            | ⚠️ Needs testing |
| Repay               | `/api/v0/repay/...`             | ⚠️ Needs testing |

**Vault slugs:** `usdc-prime`, `jlp-core`, `sol-core`, etc.

**Example:**

```bash
blinks execute "https://kamino.dial.to/api/v0/lend/usdc-prime/deposit?amount=0.1"
```

---

### Jito

**Status:** Working (use jito.network)  
**Endpoints:** `jito.network` (preferred), `jito.dial.to` (sometimes blocked)

| Action    | Path     | Tested |
| --------- | -------- | ------ |
| Stake SOL | `/stake` | ✅     |

**Note:** `jito.dial.to` sometimes returns 403 due to Cloudflare. Use `jito.network` instead.

**Example:**

```bash
blinks execute "https://jito.network/stake" --amount=1
```

---

### Tensor

**Status:** Working  
**Endpoints:** `tensor.dial.to`, `tensor.trade`

| Action    | Path                      | Tested |
| --------- | ------------------------- | ------ |
| Buy floor | `/buy-floor/{collection}` | ✅     |
| Place bid | `/bid/{collection}`       | ✅     |

---

### Drift

**Status:** Working  
**Endpoint:** `app.drift.trade`

| Action              | Path                   | Tested           |
| ------------------- | ---------------------- | ---------------- |
| Deposit to vault    | `/api/blinks/deposit`  | ✅               |
| Withdraw from vault | `/api/blinks/withdraw` | ⚠️ Needs testing |

---

## 🔑 Needs API Key

### Lulo Finance

**Status:** Requires API key  
**Get key:** [dev.lulo.fi](https://dev.lulo.fi)

| Action   | Notes                                                    |
| -------- | -------------------------------------------------------- |
| Deposit  | Works with API key                                       |
| Withdraw | **24-hour cooldown period** - must wait after requesting |

**Header required:**

```
x-api-key: YOUR_LULO_API_KEY
```

**Important:** Withdrawals are async. You request a withdrawal, wait 24 hours, then claim.

---

## ❌ Broken Protocols

### Orca

**Status:** No public blink API  
**Endpoint:** `orca.dial.to` returns 404

Orca doesn't expose a public Solana Actions endpoint. The dial.to subdomain doesn't work.

**Workaround:** Use Jupiter or Raydium for swaps instead.

---

### Sanctum

**Status:** Blocked by Cloudflare  
**Endpoint:** `sanctum.dial.to`

All requests return 403. Cloudflare blocks server/datacenter IPs.

**Workaround:** Use their web UI at [sanctum.so](https://sanctum.so)

---

### Various dial.to endpoints

Some dial.to subdomains have aggressive rate limiting or Cloudflare protection.

**Pattern:** Works from browsers but fails from servers.

**Workaround:** Try the protocol's self-hosted endpoint if available.

---

## ❓ Untested Protocols

These protocols have dial.to endpoints but haven't been verified:

| Protocol   | Endpoint            | Expected Actions     |
| ---------- | ------------------- | -------------------- |
| MarginFi   | `marginfi.dial.to`  | Lend, borrow         |
| Meteora    | `meteora.dial.to`   | DLMM, bonding curves |
| Helius     | `helius.dial.to`    | Staking              |
| Magic Eden | `magiceden.dial.to` | NFT trading          |

To test a protocol:

```bash
blinks inspect "https://{protocol}.dial.to"
```

---

## Testing New Protocols

### 1. Check the registry

```bash
curl -s "https://actions-registry.dial.to/all" | jq '.[] | select(.host | contains("protocol-name"))'
```

### 2. Inspect the endpoint

```bash
blinks inspect "https://protocol.dial.to"
```

### 3. Dry run a transaction

```bash
blinks execute "https://protocol.dial.to/action" --amount=1 --dry-run
```

### 4. Execute with small amount

```bash
blinks execute "https://protocol.dial.to/action" --amount=1
```

---

## Known Issues

### Cloudflare Blocking

Many dial.to endpoints use Cloudflare which blocks datacenter IPs.

**Symptoms:** 403 Forbidden, "Access Denied", challenge pages

**Affected:** Sanctum, sometimes Jito, possibly others

**Solutions:**

1. Use protocol's self-hosted endpoint
2. Run from residential IP
3. Use the protocol's web UI

### Rate Limiting

Public RPC and some protocol endpoints rate-limit aggressively.

**Symptoms:** 429 Too Many Requests, slow responses

**Solutions:**

1. Use dedicated RPC (Helius/QuickNode free tier)
2. Add delays between requests
3. Cache action metadata

### Stale Transactions

Blink transactions expire after ~60 seconds.

**Symptoms:** "Transaction simulation failed", "Blockhash not found"

**Solutions:**

1. Execute immediately after getting transaction
2. Don't batch-fetch transactions
3. Retry on failure

---

## Reporting Issues

If you find a protocol that's broken or working differently than documented:

1. Test with `blinks inspect` and `--dry-run`
2. Note the error message and HTTP status
3. Check if it works from the protocol's web UI
4. Update this doc or open an issue
