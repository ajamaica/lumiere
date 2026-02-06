---
name: solana-skill
description: Interact with Solana blockchain via Helius APIs. Create/manage wallets, check balances (SOL + tokens), send transactions, swap tokens via Jupiter, and monitor addresses. Use for any Solana blockchain operation, crypto wallet management, token transfers, DeFi swaps, or portfolio tracking.
---

# Solana Skill

Comprehensive Solana blockchain interaction using Helius infrastructure.

## Prerequisites

1. **Helius API Key** — Get free at https://dashboard.helius.dev/signup
2. Store key in `~/.config/solana-skill/config.json`:

```json
{
  "heliusApiKey": "your-api-key",
  "network": "mainnet-beta"
}
```

## Core Capabilities

### Wallet Management

- Create new wallets (keypair generation)
- Import existing wallets (private key or seed phrase)
- List managed wallets
- Secure key storage (encrypted at rest)

### Balance & Assets

- Check SOL balance
- Get all token balances (SPL tokens)
- View NFTs and compressed NFTs
- Portfolio valuation (via DAS API)

### Transactions

- Send SOL
- Send SPL tokens
- Transaction history (enhanced, human-readable)
- Priority fee estimation

### Swaps (Jupiter)

- Get swap quotes
- Execute token swaps
- Slippage protection

### Monitoring

- Watch addresses for activity
- Transaction notifications

## Quick Reference

### Check Balance

```typescript
import { createHelius } from 'helius-sdk'

const helius = createHelius({ apiKey: 'YOUR_KEY' })
const assets = await helius.getAssetsByOwner({
  ownerAddress: 'WALLET_ADDRESS',
  displayOptions: {
    showFungible: true,
    showNativeBalance: true,
  },
})
```

### Send SOL

```typescript
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY')
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipientPubkey,
    lamports: amount * LAMPORTS_PER_SOL,
  }),
)
await sendAndConfirmTransaction(connection, tx, [sender])
```

### Jupiter Swap

```typescript
// 1. Get quote
const quote = await fetch(
  `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`,
)

// 2. Build swap transaction
const swap = await fetch('https://api.jup.ag/swap/v1/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteResponse: await quote.json(),
    userPublicKey: wallet.publicKey.toString(),
  }),
})

// 3. Sign and send
```

## API Endpoints

| Service       | Base URL                                      |
| ------------- | --------------------------------------------- |
| Helius RPC    | `https://mainnet.helius-rpc.com/?api-key=KEY` |
| Helius Sender | `https://sender.helius-rpc.com/fast`          |
| Jupiter Quote | `https://api.jup.ag/swap/v1/quote`            |
| Jupiter Swap  | `https://api.jup.ag/swap/v1/swap`             |

## Security

**Critical rules:**

- Never log or display private keys
- Use encrypted storage for keys
- Validate all addresses before transactions
- Set reasonable slippage limits (default: 1%)
- Always confirm large transactions with user

See [references/security.md](references/security.md) for detailed security practices.

## Detailed References

- [references/helius-api.md](references/helius-api.md) — Full Helius API reference
- [references/security.md](references/security.md) — Wallet security best practices
- [references/jupiter.md](references/jupiter.md) — Jupiter swap integration

## Common Token Addresses

| Token | Mint Address                                            |
| ----- | ------------------------------------------------------- |
| SOL   | `So11111111111111111111111111111111111111112` (wrapped) |
| USDC  | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`          |
| USDT  | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`          |
| BONK  | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`          |

## Error Handling

Common errors and solutions:

- **Insufficient SOL**: Need SOL for rent + transaction fees
- **Token account not found**: Create ATA before sending tokens
- **Transaction too large**: Reduce instructions or use address lookup tables
- **Blockhash expired**: Retry with fresh blockhash
