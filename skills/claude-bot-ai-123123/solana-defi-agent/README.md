# Solana DeFi Agent Skill

> DeFi toolkit for AI agents on Solana — swaps, lending, staking, and more

Execute Solana DeFi operations programmatically through [Solana Actions](https://solana.com/developers/guides/advanced/actions). Built for AI agents, works great for humans too.

📚 **[QUICKSTART.md](./QUICKSTART.md)** — Get running in 10 minutes  
🤖 **[SKILL.md](./SKILL.md)** — OpenClaw agent integration

## Features

- 🔗 **Direct Solana Actions** - No external API dependencies
- 🤖 **AI-Agent Ready** - JSON output, structured errors
- ⚡ **Zero Config** - Works with just RPC URL and private key
- 🔒 **Trust Verification** - Validates against trusted host registry
- 🔧 **Full SDK** - Use as a library in your TypeScript projects

## Architecture

This package implements the Solana Actions specification directly:

1. **GET** request to action URL → returns metadata + available actions
2. **POST** request with `{ account }` → returns transaction to sign
3. Sign and submit transaction to Solana

No Dialect API dependency - communicates directly with protocol action endpoints.

## Supported Protocols

| Protocol | Type          | Status     | Notes                                         |
| -------- | ------------- | ---------- | --------------------------------------------- |
| Kamino   | Lending/Yield | ✅ Working | deposit, withdraw, borrow, repay              |
| Tensor   | NFT           | ✅ Working | buy-floor, bid                                |
| Jito     | Staking       | ⚠️ Routing | actions.json works, Cloudflare blocks dial.to |
| Meteora  | DLMM          | ⚠️ Partial | Has actions.json, needs pool params           |
| Drift    | Perps         | ⚠️ Partial | Has actions.json, deposit returns 500         |
| Sanctum  | LST Staking   | 🔒 Blocked | Cloudflare blocks server IPs                  |
| Jupiter  | Swap          | ❓ Unknown | Endpoint paths not discovered                 |
| Orca     | AMM           | ❓ Unknown | Endpoint paths not discovered                 |
| MarginFi | Lending       | ❓ Unknown | Endpoint paths not discovered                 |
| Raydium  | AMM           | ❓ Unknown | No actions.json found                         |

**Registry**: 964 trusted hosts available for arbitrary action execution.

See [docs/PROTOCOL-STATUS.md](./docs/PROTOCOL-STATUS.md) for detailed status.

## Installation

```bash
npm install -g @openclaw/solana-defi-agent-skill
# or
npx @openclaw/solana-defi-agent-skill
```

## Configuration

Create a `.env` file or set environment variables:

```bash
# Required
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your-base58-private-key
```

### Private Key Formats

1. **Base58** (recommended): `5abc123...`
2. **JSON Array**: `[1,2,3,4,...]` (Solana CLI format)

## Quick Start

```bash
# Check configuration
blinks status

# View wallet
blinks wallet address
blinks wallet balance

# Inspect any action URL
blinks inspect "https://jito.dial.to/stake"

# Execute an action
blinks jito stake --amount=1 --dry-run
blinks jito stake --amount=1
```

## CLI Commands

### Inspect & Execute

```bash
# Inspect any blink/action URL
blinks inspect <url>

# Execute with parameters
blinks execute <url> --amount=100
blinks execute <url> -p '{"inputMint":"...", "outputMint":"..."}'

# Dry run (simulation only)
blinks execute <url> --dry-run
```

### Protocol Commands

```bash
# Kamino
blinks kamino deposit --vault=usdc-prime --amount=100
blinks kamino withdraw --vault=usdc-prime --amount=50
blinks kamino borrow --market=<addr> --reserve=<addr> --amount=100
blinks kamino repay --market=<addr> --reserve=<addr> --amount=50
blinks kamino multiply --market=<addr> --coll-token=<mint> --debt-token=<mint> --amount=1

# Jupiter
blinks jupiter swap --input=<mint> --output=<mint> --amount=100

# Lulo
blinks lulo deposit --token=<mint> --amount=100
blinks lulo withdraw --token=<mint> --amount=50

# Drift
blinks drift vault-deposit --vault=<addr> --amount=100
blinks drift vault-withdraw --vault=<addr> --amount=50

# Sanctum (LST Staking)
blinks sanctum stake --lst=<mint> --amount=1

# Jito
blinks jito stake --amount=1

# Raydium
blinks raydium swap --input=<mint> --output=<mint> --amount=100
```

### Utilities

```bash
blinks protocols        # List all supported protocols
blinks trusted-hosts    # List verified action hosts
blinks status           # Check RPC and wallet configuration
```

### Output Formats

```bash
blinks inspect <url> -f json     # JSON (default)
blinks inspect <url> -f table    # ASCII table
blinks inspect <url> -f minimal  # Key=value
blinks inspect <url> -q          # Quiet mode
```

## SDK Usage

```typescript
import {
  ActionsClient,
  BlinksExecutor,
  Wallet,
  getConnection,
  TRUSTED_HOSTS,
} from '@openclaw/solana-defi-agent-skill'

// Initialize
const actions = new ActionsClient()
const connection = getConnection()
const wallet = Wallet.fromEnv()
const blinks = new BlinksExecutor(connection)

// Inspect an action URL
const inspection = await blinks.inspect('https://jito.dial.to/stake')
console.log(inspection.metadata) // { title, description, icon }
console.log(inspection.actions) // Available actions with parameters
console.log(inspection.trusted) // Is this from a trusted host?

// Get action metadata (GET request)
const metadata = await actions.getAction('https://jito.dial.to/stake')

// Get transaction (POST request)
const tx = await actions.postAction('https://jito.dial.to/stake', wallet.address, { amount: '1' })

// Simulate
const sim = await blinks.simulate(tx)
console.log('Success:', sim.success)
console.log('Units consumed:', sim.unitsConsumed)

// Execute
const signature = await blinks.signAndSend(tx, wallet.getSigner())
console.log('Confirmed:', signature)
console.log('Explorer:', `https://solscan.io/tx/${signature}`)
```

### TypeScript Types

```typescript
import type {
  BlinkMetadata,
  BlinkTransaction,
  BlinkParameter,
  BlinkLinkAction,
  ProtocolId,
  MarketType,
} from '@openclaw/solana-defi-agent-skill'
```

## API Reference

### ActionsClient

```typescript
const client = new ActionsClient({ timeout?: number });

// Parse action URL (handles solana-action:, blink:, dial.to interstitial)
client.parseActionUrl(url: string): string

// Check if URL is from trusted host
client.isTrustedHost(url: string): boolean

// GET - fetch action metadata
client.getAction(url: string): Promise<BlinkMetadata>

// POST - get transaction to sign
client.postAction(url: string, account: string, params?: Record<string, any>): Promise<BlinkTransaction>

// Inspect - full inspection with parsed actions
client.inspect(url: string): Promise<InspectResult>
```

### BlinksExecutor

```typescript
const executor = new BlinksExecutor(connection: Connection);

executor.getMetadata(url: string): Promise<BlinkMetadata>
executor.getTransaction(url: string, wallet: string, params?: Record<string, any>): Promise<BlinkTransaction>
executor.simulate(tx: BlinkTransaction): Promise<SimulationResult>
executor.signAndSend(tx: BlinkTransaction, signer: Signer): Promise<string>
executor.inspect(url: string): Promise<InspectResult>
executor.isTrustedHost(url: string): boolean
```

### Wallet

```typescript
const wallet = Wallet.fromEnv();
const wallet = Wallet.fromPrivateKey(key: string);
const wallet = Wallet.fromFile(path: string);

wallet.address: string
wallet.publicKey: PublicKey
wallet.sign(tx: Transaction): Transaction
wallet.getSigner(): Signer
wallet.getBalance(connection: Connection): Promise<number>
wallet.getAllBalances(connection: Connection): Promise<WalletBalance[]>
```

## Error Handling

```typescript
import { ActionError } from '@openclaw/solana-defi-agent-skill'

try {
  await client.getAction('https://invalid.url/action')
} catch (error) {
  if (error instanceof ActionError) {
    console.log('Status:', error.statusCode)
    console.log('Details:', error.details)
  }
}
```

CLI errors return JSON:

```json
{
  "error": "Failed to fetch action: 404 Not Found",
  "code": 404,
  "details": "Action endpoint not available"
}
```

## Testing

```bash
# Run all tests
npm test

# Run protocol endpoint tests
npx vitest run tests/protocols.test.ts

# Run endpoint discovery
npx vitest run tests/discover-paths.test.ts

# Test specific protocol
npx vitest run tests/protocols.test.ts -t "kamino"
```

## Development

```bash
git clone https://github.com/claude-bot-ai-123123/solana-defi-agent-skill
cd solana-defi-agent-skill
npm install
npm run build
npm run dev -- inspect https://kamino.dial.to/api/v0/lend/usdg-prime/deposit
```

## License

MIT

## Links

- [Solana Actions Spec](https://solana.com/developers/guides/advanced/actions)
- [Blinks Inspector](https://www.blinks.xyz/inspector)
- [Dialect Registry](https://dial.to/register)
- [OpenClaw](https://openclaw.io)
