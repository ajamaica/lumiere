# Poseidon OTC

Trustless P2P token swaps on Solana.

## Overview

Poseidon OTC enables direct peer-to-peer token trading without intermediaries. Both parties deposit into escrow, confirm the terms, and the swap executes atomically on-chain.

**Features:**

- Multi-token swaps (up to 4 tokens per side)
- Optional time-locks to protect against dumps
- Private rooms with invite codes
- No counterparty risk - escrow holds funds until both confirm

## Installation

```bash
npm install poseidon-otc-skill
```

Or clone directly:

```bash
git clone https://github.com/poseidon-cash/poseidon-otc-skill
cd poseidon-otc-skill
npm install && npm run build
```

## Usage

### Link Mode (Default)

Returns trade room links for manual wallet signing:

```typescript
import { PoseidonOTC } from 'poseidon-otc-skill'

const client = new PoseidonOTC()
const result = await client.createRoom()
// { success: true, roomId: '...', link: 'https://poseidon.cash/trade-room/...' }
```

### Autonomous Mode

For fully automated execution with a dedicated wallet:

```typescript
const client = new PoseidonOTC({
  burnerKey: 'your-base58-private-key',
})

await client.createRoom({ inviteCode: 'secret' })
await client.joinRoom(roomId)
await client.updateOffer(roomId, [
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 100000000, decimals: 6 },
])
await client.confirmTrade(roomId, 'first')
```

## API Reference

| Method                              | Description                             |
| ----------------------------------- | --------------------------------------- |
| `createRoom(options?)`              | Create a new trade room                 |
| `getRoom(roomId)`                   | Get room status and details             |
| `getUserRooms(wallet?)`             | List all rooms for a wallet             |
| `joinRoom(roomId, inviteCode?)`     | Join as counterparty                    |
| `updateOffer(roomId, tokens)`       | Set your token offer                    |
| `withdrawFromOffer(roomId, tokens)` | Withdraw tokens from escrow             |
| `confirmTrade(roomId, stage)`       | Confirm trade (first/second)            |
| `executeSwap(roomId)`               | Execute the atomic swap                 |
| `proposeLockup(roomId, seconds)`    | Propose lockup on counterparty's tokens |
| `acceptLockup(roomId)`              | Accept the proposed lockup              |
| `getLockupStatus(roomId)`           | Check lockup timer status               |
| `claimLockedTokens(roomId)`         | Claim tokens after lockup expires       |
| `cancelRoom(roomId)`                | Cancel and refund all deposits          |
| `declineOffer(roomId)`              | Decline current offer                   |
| `getRoomLink(roomId)`               | Get shareable URL                       |
| `getBalance()`                      | Check wallet SOL balance                |
| `isAutonomous()`                    | Check if running with wallet            |

## Trade Flow

1. **Create Room** - Party A creates a room, optionally with invite code
2. **Join Room** - Party B joins using the room link
3. **Set Offers** - Both parties specify their token amounts
4. **First Confirm** - Both confirm the trade terms
5. **Deposit** - Both deposit tokens to escrow (via frontend)
6. **Second Confirm** - Both confirm deposits are correct
7. **Execute** - Relayer executes atomic swap on-chain

## Environment Variables

```bash
POSEIDON_API_URL=https://poseidon.cash        # API endpoint
POSEIDON_RPC_URL=https://api.mainnet-beta.solana.com  # Solana RPC
POSEIDON_BURNER_KEY=<base58-private-key>      # For autonomous mode
```

## OpenClaw Integration

Add to your `skills.json`:

```json
{
  "skills": [
    {
      "name": "poseidon-otc",
      "path": "./skills/poseidon-otc-skill"
    }
  ]
}
```

Example prompts:

- "Create an OTC trade room"
- "Check status of room ABC123"
- "Join the trade at poseidon.cash/trade-room/XYZ"
- "Cancel my trade room"

## Security

- All funds held in on-chain escrow until swap
- Identity authentication via signed messages
- Time-based signature expiry (24 hours)
- Optional lockups to prevent immediate dumps

**Warning:** Autonomous mode requires funding a hot wallet. Only deposit amounts you're comfortable risking.

## Program

**Mainnet:** `AfiRReYhvykHhKXhwjhcsXFejHdxqYLk2QLWnjvvLKUN`

## Links

- Website: https://poseidon.cash
- Docs: https://docs.poseidon.cash

## License

MIT
