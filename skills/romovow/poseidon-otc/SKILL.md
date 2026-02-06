---
name: poseidon-otc
description: Execute trustless P2P token swaps on Solana via the Poseidon OTC protocol. Create trade rooms, negotiate offers, lock tokens with time-based escrow, and execute atomic on-chain swaps. Supports agent-to-agent trading with real-time WebSocket updates.
metadata:
  {
    'openclaw':
      {
        'emoji': '🔱',
        'requires': { 'env': ['POSEIDON_BURNER_KEY'] },
        'primaryEnv': 'POSEIDON_BURNER_KEY',
        'homepage': 'https://poseidon.cash',
      },
  }
---

# Poseidon OTC Skill

**TL;DR for Agents:** This skill lets you trade tokens with humans or other agents on Solana. You create a room, both parties deposit tokens to escrow, confirm, and execute an atomic swap. No trust required - it's all on-chain.

## When to Use This Skill

- **Trading tokens P2P** - Swap any SPL token directly with another party
- **Agent-to-agent commerce** - Two AI agents can negotiate and execute trades autonomously
- **Large OTC deals** - Avoid slippage from DEX trades by going direct
- **Protected trades** - Use lockups to prevent counterparty from dumping immediately
- **Multi-token swaps** - Trade up to 4 tokens per side in one atomic transaction

## Quick Start for Agents

### 1. Initialize (requires wallet)

```typescript
import { PoseidonOTC } from 'poseidon-otc-skill'

const client = new PoseidonOTC({
  burnerKey: process.env.POSEIDON_BURNER_KEY, // base58 private key
})
```

### 2. Create a Trade Room

```typescript
const { roomId, link } = await client.createRoom()
// Share `link` with counterparty or another agent
```

### 3. Wait for Counterparty & Set Offer

```typescript
// Check room status
const room = await client.getRoom(roomId)

// Set what you're offering (100 USDC example)
await client.updateOffer(roomId, [
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
    amount: 100000000, // 100 USDC (6 decimals)
    decimals: 6,
  },
])
```

### 4. Confirm & Execute

```typescript
// First confirmation = "I agree to these terms"
await client.confirmTrade(roomId, 'first')

// After deposits, second confirmation
await client.confirmTrade(roomId, 'second')

// Execute the atomic swap
const { txSignature } = await client.executeSwap(roomId)
```

## Complete Trade Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRADE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CREATE ROOM                                                 │
│     └─> Party A calls createRoom()                              │
│         Returns: roomId, shareable link                         │
│                                                                 │
│  2. JOIN ROOM                                                   │
│     └─> Party B calls joinRoom(roomId)                          │
│         Room now has both participants                          │
│                                                                 │
│  3. SET OFFERS                                                  │
│     └─> Both parties call updateOffer(roomId, tokens)           │
│         Each specifies what they're putting up                  │
│                                                                 │
│  4. FIRST CONFIRM (agree on terms)                              │
│     └─> Both call confirmTrade(roomId, 'first')                 │
│         "I agree to swap my X for your Y"                       │
│                                                                 │
│  5. DEPOSIT TO ESCROW                                           │
│     └─> Tokens move to on-chain escrow                          │
│         (Handled by frontend or depositToEscrow)                │
│                                                                 │
│  6. SECOND CONFIRM (verify deposits)                            │
│     └─> Both call confirmTrade(roomId, 'second')                │
│         "I see the deposits, ready to swap"                     │
│                                                                 │
│  7. EXECUTE SWAP                                                │
│     └─> Either party calls executeSwap(roomId)                  │
│         Atomic on-chain swap via relayer                        │
│         Returns: txSignature                                    │
│                                                                 │
│  [OPTIONAL] LOCKUP FLOW                                         │
│     └─> Before step 4, Party A can proposeLockup(roomId, secs)  │
│     └─> Party B must acceptLockup(roomId) to continue           │
│     └─> After execute, locked tokens claimed via claimLockedTokens │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### Room Management

| Method                          | Parameters                | Returns            | Description         |
| ------------------------------- | ------------------------- | ------------------ | ------------------- |
| `createRoom(options?)`          | `{ inviteCode?: string }` | `{ roomId, link }` | Create new room     |
| `getRoom(roomId)`               | `roomId: string`          | `TradeRoom`        | Get full room state |
| `getUserRooms(wallet?)`         | `wallet?: string`         | `TradeRoom[]`      | List your rooms     |
| `joinRoom(roomId, inviteCode?)` | `roomId, inviteCode?`     | `{ success }`      | Join as Party B     |
| `cancelRoom(roomId)`            | `roomId: string`          | `{ success }`      | Cancel & refund     |
| `getRoomLink(roomId)`           | `roomId: string`          | `string`           | Get share URL       |

### Trading

| Method                              | Parameters                           | Returns           | Description      |
| ----------------------------------- | ------------------------------------ | ----------------- | ---------------- |
| `updateOffer(roomId, tokens)`       | `roomId, [{mint, amount, decimals}]` | `{ success }`     | Set your offer   |
| `withdrawFromOffer(roomId, tokens)` | `roomId, tokens[]`                   | `{ success }`     | Pull back tokens |
| `confirmTrade(roomId, stage)`       | `roomId, 'first'│'second'`           | `{ success }`     | Confirm stage    |
| `executeSwap(roomId)`               | `roomId: string`                     | `{ txSignature }` | Execute swap     |
| `declineOffer(roomId)`              | `roomId: string`                     | `{ success }`     | Reject terms     |

### Lockups (Anti-Dump)

| Method                           | Parameters        | Returns                       | Description        |
| -------------------------------- | ----------------- | ----------------------------- | ------------------ |
| `proposeLockup(roomId, seconds)` | `roomId, seconds` | `{ success }`                 | Propose lock       |
| `acceptLockup(roomId)`           | `roomId: string`  | `{ success }`                 | Accept lock        |
| `getLockupStatus(roomId)`        | `roomId: string`  | `{ canClaim, timeRemaining }` | Check timer        |
| `claimLockedTokens(roomId)`      | `roomId: string`  | `{ txSignature }`             | Claim after expiry |

### Utility

| Method              | Parameters | Returns           | Description         |
| ------------------- | ---------- | ----------------- | ------------------- |
| `getBalance()`      | none       | `{ sol: number }` | Check SOL balance   |
| `isAutonomous()`    | none       | `boolean`         | Has signing wallet? |
| `getWebSocketUrl()` | none       | `string`          | Get WS endpoint     |

## WebSocket Real-Time Updates

**Don't poll. Subscribe.**

Instead of repeatedly calling `getRoom()`, connect to WebSocket for instant updates:

**Endpoint:** `wss://poseidon.cash/ws/trade-room`

### Subscribe to Room Events

```typescript
const { unsubscribe } = await client.subscribeToRoom(roomId, (event) => {
  switch (event.type) {
    case 'join':
      console.log('Counterparty joined!')
      break
    case 'offer':
      console.log('Offer updated:', event.data.tokens)
      break
    case 'confirm':
      console.log('Confirmation received')
      break
    case 'execute':
      console.log('Swap complete! TX:', event.data.txSignature)
      break
    case 'cancel':
      console.log('Trade cancelled')
      break
  }
})
```

### Event Types

| Event        | When It Fires                                  |
| ------------ | ---------------------------------------------- |
| `full-state` | Immediately on subscribe - complete room state |
| `join`       | Counterparty joined the room                   |
| `offer`      | Someone updated their offer                    |
| `confirm`    | Someone confirmed (first or second)            |
| `lockup`     | Lockup proposed or accepted                    |
| `execute`    | Swap executed successfully                     |
| `cancel`     | Room was cancelled                             |
| `terminated` | Room expired or terminated                     |
| `error`      | Something went wrong                           |

### WebSocket Actions (Faster than HTTP)

```typescript
await client.sendOfferViaWs(roomId, tokens) // Update offer
await client.sendConfirmViaWs(roomId, 'first') // Confirm
await client.sendLockupProposalViaWs(roomId, 3600) // Propose 1hr lock
await client.sendAcceptLockupViaWs(roomId) // Accept lock
await client.sendExecuteViaWs(roomId) // Execute swap
```

## Agent-to-Agent Trading Example

**Scenario:** Agent A wants to sell 1000 USDC for 5 SOL to Agent B

### Agent A (Seller):

```typescript
// 1. Create room
const { roomId } = await client.createRoom()

// 2. Set offer (1000 USDC)
await client.updateOffer(roomId, [
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: 1000000000, // 1000 USDC
    decimals: 6,
  },
])

// 3. Share roomId with Agent B via your inter-agent protocol
// 4. Subscribe to updates
await client.subscribeToRoom(roomId, async (event) => {
  if (event.type === 'offer') {
    // Check if Agent B's offer is acceptable (5 SOL)
    const room = await client.getRoom(roomId)
    if (room.partyBTokenSlots?.[0]?.amount >= 5 * 1e9) {
      await client.confirmTrade(roomId, 'first')
    }
  }
  if (event.type === 'confirm' && room.partyBFirstConfirm) {
    await client.confirmTrade(roomId, 'second')
  }
})
```

### Agent B (Buyer):

```typescript
// 1. Join the room
await client.joinRoom(roomId)

// 2. Set offer (5 SOL)
await client.updateOffer(roomId, [
  {
    mint: 'So11111111111111111111111111111111111111112', // wSOL
    amount: 5000000000, // 5 SOL
    decimals: 9,
  },
])

// 3. Subscribe and react
await client.subscribeToRoom(roomId, async (event) => {
  if (event.type === 'confirm') {
    const room = await client.getRoom(roomId)
    if (room.partyAFirstConfirm && !room.partyBFirstConfirm) {
      await client.confirmTrade(roomId, 'first')
    }
    if (room.partyASecondConfirm && room.partyBSecondConfirm) {
      // Both confirmed, execute!
      await client.executeSwap(roomId)
    }
  }
})
```

## Common Token Mints

| Token | Mint Address                                   | Decimals |
| ----- | ---------------------------------------------- | -------- |
| USDC  | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6        |
| USDT  | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6        |
| wSOL  | `So11111111111111111111111111111111111111112`  | 9        |
| BONK  | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | 5        |

## Environment Variables

```bash
POSEIDON_BURNER_KEY=<base58-private-key>  # Required for autonomous mode
POSEIDON_API_URL=https://poseidon.cash    # API endpoint (default: mainnet)
POSEIDON_RPC_URL=https://api.mainnet-beta.solana.com  # Solana RPC
```

## Security Notes

- **Escrow is on-chain** - Funds are held by the Solana program, not the API
- **Atomic swaps** - Either both sides complete or neither does
- **Signatures expire** - Auth signatures valid for 24 hours
- **Lockups are enforced on-chain** - Can't bypass the timer
- **Hot wallet warning** - Only fund your burner wallet with amounts you're comfortable risking

## Program ID

**Mainnet:** `AfiRReYhvykHhKXhwjhcsXFejHdxqYLk2QLWnjvvLKUN`

## Links

- Website: https://poseidon.cash
- Docs: https://docs.poseidon.cash
