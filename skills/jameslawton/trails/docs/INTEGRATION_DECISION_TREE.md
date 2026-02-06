# Integration Decision Tree

Use this guide to determine which Trails integration method is best for a given project.

## Quick Decision Matrix

| Scenario                     | Recommended            | Why                        |
| ---------------------------- | ---------------------- | -------------------------- |
| React app, wants fast setup  | **Widget**             | Pre-built UI, minimal code |
| React app, custom UI needed  | **Headless SDK**       | Hooks + your design        |
| Next.js ecommerce checkout   | **Widget (Pay)**       | Drop-in payment flow       |
| DeFi app with vault deposits | **Widget (Fund/Earn)** | Handles calldata           |
| Backend automation           | **Direct API**         | Full server-side control   |
| Non-React frontend           | **Direct API**         | No React dependency        |
| Mobile app (React Native)    | **Direct API**         | SDK is web-focused         |
| Batch processing             | **Direct API**         | Programmatic execution     |

## Decision Flowchart

```
START
  │
  ├─ Is this a React/Next.js app?
  │   │
  │   ├─ YES
  │   │   │
  │   │   ├─ Do you want pre-built UI?
  │   │   │   │
  │   │   │   ├─ YES → WIDGET
  │   │   │   │
  │   │   │   └─ NO (custom UI)
  │   │   │       │
  │   │   │       ├─ Using wagmi?
  │   │   │       │   │
  │   │   │       │   ├─ YES → HEADLESS SDK
  │   │   │       │   │
  │   │   │       │   └─ NO → Consider adding wagmi, or use DIRECT API
  │   │   │       │
  │   │   │       └─ Need full control? → DIRECT API
  │   │   │
  │   │   └─ Server-side only (API routes)? → DIRECT API
  │   │
  │   └─ NO (Node.js, Python, Go, etc.)
  │       │
  │       └─ DIRECT API
  │
  └─ END
```

## Mode Selection (Widget/Headless)

Once you've chosen Widget or Headless, pick the right mode:

| Use Case                                        | Mode | Trade Type   |
| ----------------------------------------------- | ---- | ------------ |
| **Payments** — customer pays for goods/services | Pay  | EXACT_OUTPUT |
| **Token exchange** — swap one token for another | Swap | User chooses |
| **Deposits** — add funds to a protocol/vault    | Fund | EXACT_INPUT  |
| **DeFi yields** — deposit into yield protocols  | Earn | EXACT_INPUT  |

### Pay Mode

- **When**: Merchant needs exact amount received
- **User experience**: "Pay $50 worth" → user pays whatever input token
- **Trade type**: EXACT_OUTPUT (destination amount is fixed)

### Swap Mode

- **When**: User wants to exchange tokens
- **User experience**: Standard DEX-like flow
- **Trade type**: EXACT_INPUT or EXACT_OUTPUT (user picks)

### Fund Mode

- **When**: User deposits funds, amount can vary
- **User experience**: "Deposit up to 100 USDC" → bridge and deposit
- **Trade type**: EXACT_INPUT (user picks how much to send)
- **Calldata**: Often used with destination contract calls

### Earn Mode

- **When**: Deposit into integrated DeFi protocols
- **User experience**: Pick protocol, deposit amount
- **Trade type**: EXACT_INPUT

## Questions to Ask (When Unclear)

If you can't determine the right integration from context, ask **at most 3** of these:

1. **"Are you building with React/Next.js, or is this a backend service?"**
   - React → Widget or Headless
   - Backend → API

2. **"Do you want a pre-built UI, or are you building your own interface?"**
   - Pre-built → Widget
   - Custom → Headless or API

3. **"What's the main use case: payments, swaps, deposits, or something else?"**
   - Determines mode (Pay/Swap/Fund/Earn)

## Example Mappings

### "I'm building an ecommerce checkout"

→ **Widget (Pay mode)** — exact payment amounts, drop-in UI

### "I want users to bridge and stake in my vault"

→ **Widget (Fund mode) with calldata** — input-driven deposit + contract call

### "I need to process refunds from my Node.js backend"

→ **Direct API** — server-side Quote→Commit→Execute→Wait

### "I'm making a DEX aggregator with custom UI"

→ **Headless SDK** — hooks for routing, your UI for display

### "I want to add cross-chain swaps to my existing swap UI"

→ **Headless SDK** — `useQuote` with your components (executes automatically)

## Checklist Before Starting

- [ ] Identified framework (React/Next/Node/other)
- [ ] Identified wallet stack (wagmi/viem/ethers/none)
- [ ] Decided on UI approach (pre-built/custom/none)
- [ ] Identified use case and mode
- [ ] Have Trails API key ready
- [ ] Know target chains and tokens
