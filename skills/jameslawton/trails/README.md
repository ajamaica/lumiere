# Trails Agent Skill for Claude Code

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Trails Docs](https://img.shields.io/badge/docs-trails.build-purple?style=flat-square)](https://docs.trails.build)

An expert AI agent skill that helps you integrate [Trails](https://trails.build) cross-chain infrastructure into your applications with intelligent guidance and working code generation.

> **Quick Start**: Install with one command:
>
> ```bash
> npx skills add 0xsequence-demos/trails-skills
> ```
>
> Then ask your AI agent: _"I want to add cross-chain payments to my Next.js app"_

---

## What is Trails?

Trails enables seamless cross-chain token transfers, swaps, and smart contract execution across multiple blockchain networks. Users can pay, swap, or fund with any token from any supported chain, and Trails handles the routing, bridging, and execution automatically.

### Core Capabilities

**🔗 Cross-Chain Operations**

- Bridge tokens between 10+ EVM chains (Ethereum, Base, Arbitrum, Optimism, Polygon, etc.)
- Automatic routing through the best liquidity paths
- Single-transaction UX even for complex multi-hop operations

**💱 Token Swaps & Payments**

- Accept payments in any token, receive in your preferred token
- User chooses input, you specify output (or vice versa)
- Real-time pricing with slippage protection

**🎯 Smart Contract Execution**

- Execute contract calls on the destination chain after bridging
- Perfect for DeFi deposits, NFT mints, vault staking, and more
- Automatic placeholder amounts for dynamic calldata

**⚡ Developer Experience**

- Drop-in Widget for instant integration (< 10 lines of code)
- Headless hooks for custom UX with full control
- REST API for server-side automation and backends
- Built-in wagmi support and Web3 wallet integration

---

## Integration Modes

Trails provides three integration approaches:

### 🎨 Widget (Drop-in UI)

**Best for:** React/Next.js apps wanting instant cross-chain functionality

Pre-built, themeable UI components:

- **Pay Mode** — Accept exact-amount payments (EXACT_OUTPUT)
- **Swap Mode** — Token trading interface
- **Fund Mode** — Deposit flows with optional contract execution (EXACT_INPUT)
- **Earn Mode** — DeFi protocol deposits with yield optimization

```tsx
<TrailsWidget
  mode="pay"
  destinationChainId={8453}
  destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  destinationAmount="10000000" // 10 USDC
/>
```

### 🎛️ Headless SDK (Custom UX)

**Best for:** React apps with existing UI/UX needing programmatic control

React hooks for custom implementations:

- Transaction execution with custom UI
- Token/chain discovery and filtering
- Transaction history and status tracking

```tsx
const { useQuote } = useQuote()
const { data: tokens } = useSupportedTokens()
```

### 🔌 Direct API (Server-Side)

**Best for:** Backend services, automation, non-React apps, AI agents

REST API for server-side integrations:

- **SDK Client** for Node.js/TypeScript projects
- **Raw HTTP/Fetch** for AI agents, Python, Go, or any language
- Quote generation and intent execution
- Transaction monitoring and receipts

```typescript
// SDK Client (Node.js)
const quote = await trails.quoteIntent({ ... });
const intent = await trails.commitIntent({ quoteId });
const receipt = await trails.executeIntent({ intentId });

// Or Raw Fetch (Universal)
const quote = await fetch('https://api.trails.build/quote', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ ...params })
});
```

---

## What This Skill Does

When installed, the Trails skill becomes your AI integration assistant. It:

✅ **Detects your stack** — Scans for React, Next.js, wagmi, viem  
✅ **Recommends the best approach** — Widget, Headless SDK, or Direct API  
✅ **Generates working code** — Provider setup, integration snippets, environment config  
✅ **Guides advanced features** — Calldata encoding, token discovery, error handling  
✅ **Troubleshoots issues** — Provider hierarchy, modal rendering, transaction debugging

### Activation Triggers

The skill automatically activates when you mention:

- **Trails**: "trails", "integrate trails", "cross-chain"
- **Operations**: "bridge tokens", "swap", "payments", "pay widget"
- **Modes**: "fund mode", "earn mode", "swap widget"
- **Concepts**: "intents", "chain abstraction", "unified liquidity"
- **Use cases**: "accept any token", "cross-chain payments", "bridge and execute"

---

## Installation

### Universal Installation (Recommended)

Install using the universal [Skills CLI](https://skills.sh/):

```bash
npx skills add 0xsequence-demos/trails-skills
```

This works with:

- OpenClaw
- Claude Code
- Cursor
- Cline
- Windsurf
- And other AI coding agents

Then **restart your AI agent** and try asking:

```
I want to integrate Trails into my Next.js app
```

### Claude Code (Native)

Alternatively, in Claude Code:

```
/plugin marketplace add 0xsequence-demos/trails-skills
/plugin install trails@0xsequence-demos/trails-skills
```

Then **restart Claude Code completely**.

### Verify Installation

The skill should activate automatically when you mention:

- "trails", "cross-chain", "bridge", "swap"
- "accept any token", "cross-chain payments"
- "pay widget", "fund mode", "earn mode"

---

## Use Cases

### Cross-Chain Payments

Enable customers to pay in any token while you receive exactly what you need:

- E-commerce checkouts
- Subscription payments
- Merchant settlements

### DeFi Protocol Funding

Allow users to deposit from any chain without complex bridging:

- Vault deposits with automatic conversion
- Staking with cross-chain entry
- Liquidity provision from any source

### Token Swaps & Trading

Provide swap functionality with cross-chain liquidity:

- DEX aggregation across chains
- Portfolio rebalancing
- Token migration flows

### Smart Contract Execution

Bridge and execute in a single flow:

- NFT minting with payment in any token
- DAO voting with cross-chain participation
- Multi-chain protocol interactions

---

## Quick Examples

### Widget: Pay Mode

```tsx
import { TrailsWidget } from '@0xtrails/trails'

;<TrailsWidget
  mode="pay"
  destinationChainId={8453}
  destinationTokenAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  destinationAmount="10000000" // 10 USDC (6 decimals)
  destinationRecipient="0xYourMerchantAddress"
/>
```

### Headless SDK: Custom Swap

```tsx
import { useQuote } from '@0xtrails/trails'

function SwapButton() {
  const { quote, isPending, isSuccess } = useQuote({
    destinationChainId: 8453,
    destinationTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    destinationAmount: '1000000',
  })

  return (
    <div>
      <button disabled={isPending || isSuccess}>
        {isPending ? 'Processing...' : isSuccess ? 'Complete!' : 'Swap'}
      </button>
      {isSuccess && <p>Swap successful!</p>}
    </div>
  )
}
```

### Direct API: Backend Settlement

```typescript
import { TrailsAPI } from '@0xtrails/trails-api'

const trails = new TrailsAPI({ apiKey: process.env.TRAILS_API_KEY })

const quote = await trails.quoteIntent({
  sourceChainId: 1,
  destinationChainId: 8453,
  amount: '1000000000',
  tradeType: 'EXACT_INPUT',
})

const intent = await trails.commitIntent({ quoteId: quote.quoteId })
const receipt = await trails.executeIntent({ intentId: intent.intentId })
```

---

## Getting Your Trails API Key

**You'll need an API key before integrating Trails.** The skill will prompt you to get one if you don't have it yet.

### Get Your Key

1. Visit **[https://dashboard.trails.build](https://dashboard.trails.build)**
2. Create an account (or sign in if you have one)
3. Navigate to the API Keys section
4. Generate a new API key
5. Copy your key

### Add to Your Project

Create or update your `.env` file:

```bash
# For React/Next.js (client-side)
NEXT_PUBLIC_TRAILS_API_KEY=your_api_key_here

# For server-side (Direct API)
TRAILS_API_KEY=your_api_key_here
```

**The skill will check for this automatically and guide you through the setup!**

---

---

## Supported Networks

- See [docs.trails.build](https://docs.trails.build) for the complete list

---

## Documentation & Support

### Official Documentation

- **Trails Docs**: [docs.trails.build](https://docs.trails.build)
- **API Reference**: See embedded docs in the skill
- **Dashboard**: [dashboard.trails.build](https://dashboard.trails.build) (get API keys)

### Common Questions

**Q: Which integration mode should I use?**  
A: Just ask the skill! Say "I want to integrate trails" and it will recommend the best approach based on your stack.

**Q: Can I use Trails without React?**  
A: Yes! Use the Direct API for Node.js, Python, Go, or any language with HTTP support.

### Troubleshooting

If the skill isn't activating:

1. **Verify installation**: Check that `.claude/skills/trails/` exists with `SKILL.md` inside
2. **Restart Claude Code**: Quit completely and reopen (not just reload)
3. **Use explicit trigger**: Try "Using the trails skill, help me integrate cross-chain payments"
4. **Check Claude Code logs**: Look for any error messages related to skill loading

---

## About Trails

[Trails](https://trails.build) is cross-chain infrastructure that makes token transfers, swaps, and smart contract execution as simple as single-chain transactions - built for payments, stablecoins, and cross-chain orchestration.

Built by [0xtrails](https://twitter.com/0xtrails) to eliminate the complexity of cross-chain interactions.

---

## License

MIT © 0xtrails

---

## Contributing

This skill is open source. To contribute or report issues, visit:
[github.com/0xsequence-demos/trails-skills](https://github.com/0xsequence-demos/trails-skills)
