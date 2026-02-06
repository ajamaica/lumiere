# NadFun Integration Guide

Monad blockchain token launchpad with bonding curves. Trade tokens, launch your own, monitor events—all with pure viem.

## Skills

| Module           | Purpose                                | URL                                                  |
| ---------------- | -------------------------------------- | ---------------------------------------------------- |
| **skill.md**     | Architecture, constants, setup         | [nad.fun/skill.md](https://nad.fun/skill.md)         |
| **ABI.md**       | Smart contract ABIs                    | [nad.fun/abi.md](https://nad.fun/abi.md)             |
| **QUOTE.md**     | Price quotes, curve state              | [nad.fun/quote.md](https://nad.fun/quote.md)         |
| **TRADING.md**   | Buy, sell, permit signatures           | [nad.fun/trading.md](https://nad.fun/trading.md)     |
| **TOKEN.md**     | Balances, metadata, transfers          | [nad.fun/token.md](https://nad.fun/token.md)         |
| **CREATE.md**    | Token creation, image upload           | [nad.fun/create.md](https://nad.fun/create.md)       |
| **INDEXER.md**   | Historical event querying              | [nad.fun/indexer.md](https://nad.fun/indexer.md)     |
| **AGENT-API.md** | REST API, API key management           | [nad.fun/agent-api.md](https://nad.fun/agent-api.md) |
| **WALLET.md**    | Wallet generation                      | [nad.fun/wallet.md](https://nad.fun/wallet.md)       |
| **AUSD.md**      | LiFi swap (MON → aUSD) + Upshift vault | [nad.fun/ausd.md](https://nad.fun/ausd.md)           |

## Network Constants

```typescript
const NETWORK = "testnet" // 'testnet' | 'mainnet'

const CONFIG = {
  testnet: {
    chainId: 10143,
    rpcUrl: "https://monad-testnet.drpc.org",
    apiUrl: "https://dev-api.nad.fun",
    DEX_ROUTER: "0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2",
    BONDING_CURVE_ROUTER: "0x865054F0F6A288adaAc30261731361EA7E908003",
    LENS: "0xB056d79CA5257589692699a46623F901a3BB76f1",
    CURVE: "0x1228b0dc9481C11D3071E7A924B794CfB038994e",
    WMON: "0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd",
    V3_FACTORY: "0xd0a37cf728CE2902eB8d4F6f2afc76854048253b",
    CREATOR_TREASURY: "0x24dFf9B68fA36f8400302e2babC3e049eA19459E",
  },
  mainnet: {
    chainId: 143,
    rpcUrl: "https://monad-mainnet.drpc.org",
    apiUrl: "https://api.nadapp.net",
    DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137",
    BONDING_CURVE_ROUTER: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22",
    LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea",
    CURVE: "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE",
    WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    V3_FACTORY: "0x6B5F564339DbAD6b780249827f2198a841FEB7F3",
    CREATOR_TREASURY: "0x42e75B4B96d7000E7Da1e0c729Cec8d2049B9731",
  },
}[NETWORK]
```

## Basic Setup

```typescript
import { createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"

const chain = {
  id: CONFIG.chainId,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } },
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

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

## Core Concepts

### Bonding Curve

Tokens start on a bonding curve. Price increases as more buy. Check state with `getCurveState(token)`.

### Graduation

When target reserves reached: curve → Uniswap V3 DEX. Check `isGraduated(token)` or `getProgress(token)` (0-10000 = 0-100%).

### Permit Signatures (EIP-2612)

Sign approval off-chain for gasless approve: `generatePermitSignature()` → use in `sellPermit()`.

### Action IDs

Always use `actionId: 1` for token creation.

## Authentication (Login Flow)

**Login is NOT required for any functionality.** All trading, token creation, and queries work without login.

Login is ONLY needed to manage API keys (create/list/delete). See `AGENT-API.md` for:

- Rate limits (10 req/min without key, 100 req/min with key)
- API key CRUD operations

Cookie name: `nadfun-v3-api`

```typescript
// 1. Request nonce
const { nonce } = await fetch(`${CONFIG.apiUrl}/auth/nonce`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address: account.address }),
}).then((r) => r.json())

// 2. Sign nonce
const signature = await walletClient.signMessage({ message: nonce })

// 3. Create session
const sessionRes = await fetch(`${CONFIG.apiUrl}/auth/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ signature, nonce, chain_id: CONFIG.chainId }),
})
// Cookie: nadfun-v3-api=<token>
const cookies = sessionRes.headers.get("set-cookie")

// 4. Use session for API key management
await fetch(`${CONFIG.apiUrl}/api-key`, {
  headers: { Cookie: cookies },
})
```

## Common Pitfalls

- **Gas estimation**: Always `estimateContractGas()` before sending. Never hardcode gas limits.
- **Deadline**: Must be future timestamp. Use `BigInt(Math.floor(Date.now() / 1000) + 300)` (5 min).
- **Slippage**: Calculate `amountOutMin` with buffer. `(amountOut * 99n) / 100n` = 1% slippage.
- **Permit nonce**: Fetch immediately before signing. Stale nonce = tx revert.

## Common ABI Errors

| Error                | Meaning                        |
| -------------------- | ------------------------------ |
| `InsufficientAmount` | Output < amountOutMin          |
| `DeadlineExpired`    | Deadline passed                |
| `AlreadyGraduated`   | Token on DEX                   |
| `BondingCurveLocked` | Curve locked during graduation |
| `InvalidProof`       | Bad merkle proof (claims)      |

## Installation

```bash
npm install viem
```
