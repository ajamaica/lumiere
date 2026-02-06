# Einstein x402 Payment Guide

How x402 micropayments work for Einstein analytics services.

## What is x402?

x402 is an HTTP-native payment protocol that uses the HTTP 402 ("Payment Required") status code. It enables machine-to-machine micropayments without accounts, API keys, or subscriptions.

**Think of it as:** HTTP authentication, but with money instead of credentials.

## How It Works

### The 3-Step Flow

```
1. REQUEST → Server responds 402 + payment challenge
2. SIGN    → Client signs USDC transfer authorization
3. PAY+GET → Client re-sends request with payment → gets data
```

### Step 1: Fetch Payment Challenge

When you hit an Einstein endpoint without payment:

```http
POST /x402/bitquery/topvolume HTTP/1.1
Content-Type: application/json

{"chain": "base", "limit": 10, "timeperiod": "7d"}
```

Server responds:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64-encoded challenge>
```

The decoded challenge contains:

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "asset": "USDC",
      "payTo": "0x<einstein-wallet>",
      "amount": "0.55",
      "decimals": 6,
      "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "extra": {
        "name": "USD Coin",
        "version": "2"
      },
      "maxTimeoutSeconds": 300
    }
  ]
}
```

### Step 2: Sign Payment

The client signs an EIP-712 `TransferWithAuthorization` (EIP-3009) message:

```
Domain:
  name: "USD Coin"
  version: "2"
  chainId: 8453
  verifyingContract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

Message (TransferWithAuthorization):
  from: <your wallet address>
  to: <einstein wallet address>
  value: 550000 (0.55 USDC × 10^6)
  validAfter: <now - 60 seconds>
  validBefore: <now + timeout>
  nonce: <random 32 bytes>
```

This signature authorizes USDC to transfer **without a separate approval transaction**. The USDC contract on Base natively supports EIP-3009, so the transfer is gasless for the payer.

### Step 3: Execute with Payment

The signed payload is base64-encoded and sent as a header:

```http
POST /x402/bitquery/topvolume HTTP/1.1
Content-Type: application/json
X-PAYMENT: <base64-encoded payment payload>

{"chain": "base", "limit": 10, "timeperiod": "7d"}
```

> **Note:** This skill uses the `X-PAYMENT` header (V1) which reliably passes through CDN/proxy infrastructure. The V2 `PAYMENT-SIGNATURE` header is also supported by the server but may be stripped by some reverse proxies.

Server verifies the signature via the Coinbase CDP facilitator, settles the USDC transfer, and returns the data:

```http
HTTP/1.1 200 OK
PAYMENT-RESPONSE: <base64-encoded receipt>

{...analytics data...}
```

## Cost Structure

| Tier          | Raw Data | With AI Analysis |
| ------------- | -------- | ---------------- |
| Basic         | $0.25    | $0.40            |
| Standard      | $0.40    | $0.55            |
| Platform      | $0.60    | $0.75            |
| Advanced      | $0.85    | $1.00            |
| Comprehensive | $1.00    | $1.15            |

**AI analysis premium:** +$0.15 per query. Includes AI-generated insights, risk assessments, and actionable recommendations alongside the raw data.

## Funding Your Wallet

### Get USDC on Base

1. **Bridge from Ethereum:** https://bridge.base.org
2. **Buy directly:** Use Coinbase, then send USDC to Base
3. **DEX swap:** Swap ETH for USDC on Base via Uniswap or Aerodrome

### How Much to Fund

- Light usage (5-10 queries/day): $5-10 USDC
- Moderate usage (20-50 queries/day): $20-50 USDC
- Heavy usage (100+ queries/day): $50-100 USDC

### Check Balance

```bash
# Via the setup script
node scripts/einstein-setup.mjs

# Or directly via cast (if installed)
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)(uint256)" <your-wallet-address> \
  --rpc-url https://mainnet.base.org
```

## Security Considerations

### Private Key Safety

- **Never share your private key**
- Use a **dedicated wallet** with only the USDC needed for queries
- The skill stores the key in `config.json` — ensure this file is gitignored
- Alternatively, use the `EINSTEIN_X402_PRIVATE_KEY` environment variable

### What the Signature Authorizes

Each EIP-3009 signature authorizes a **single, exact transfer**:

- Fixed amount (e.g., exactly $0.55 USDC)
- Fixed recipient (Einstein's wallet)
- Time-bounded (expires after the timeout period)
- Single-use nonce (cannot be replayed)

The signature **cannot** be used to:

- Transfer more than the stated amount
- Transfer to a different address
- Execute multiple times
- Approve unlimited spending

### Facilitator

Payment verification and settlement is handled by the **Coinbase CDP facilitator** (`https://api.cdp.coinbase.com/platform/v2/x402`). This is Coinbase's official x402 infrastructure.

## Payment Headers Reference

| Header               | Direction      | Protocol    | Purpose           |
| -------------------- | -------------- | ----------- | ----------------- |
| `PAYMENT-REQUIRED`   | Response (402) | v2          | Payment challenge |
| `PAYMENT-SIGNATURE`  | Request        | v2          | Signed payment    |
| `PAYMENT-RESPONSE`   | Response (200) | v2          | Payment receipt   |
| `X-PAYMENT`          | Request        | v1 (legacy) | Signed payment    |
| `X-PAYMENT-RESPONSE` | Response (200) | v1 (legacy) | Payment receipt   |

The Einstein skill sends the `X-PAYMENT` header (V1) for reliable delivery through CDN/proxy layers.

## Network Details

| Property               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| Payment Network        | Base (chain ID 8453)                            |
| Network ID (CAIP-2)    | `eip155:8453`                                   |
| Token                  | USDC                                            |
| Token Address          | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`    |
| Token Decimals         | 6                                               |
| EIP-712 Domain Name    | `USD Coin`                                      |
| EIP-712 Domain Version | `2`                                             |
| Facilitator            | `https://api.cdp.coinbase.com/platform/v2/x402` |
| Signature Scheme       | EIP-3009 TransferWithAuthorization              |

## Troubleshooting

### "Payment rejected"

- Check USDC balance on Base
- Ensure private key is correct (64 hex chars + 0x prefix = 66 chars)
- The payment challenge may have expired — retry the request

### "Facilitator error"

- Coinbase CDP facilitator may be temporarily down
- Retry after a few seconds

### "Signature verification failed"

- The private key may not match the wallet with USDC
- Check that you're on Base mainnet, not testnet

### "Nonce already used"

- Retry the request — a new nonce will be generated automatically
