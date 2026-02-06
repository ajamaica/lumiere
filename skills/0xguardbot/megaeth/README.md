# MegaETH Developer Skill for AI Agents

A comprehensive skill for AI coding agents (Claude Code, OpenClaw, Codex) to build real-time applications on MegaETH.

## Overview

This skill provides AI agents with deep knowledge of the MegaETH development ecosystem:

- **Transactions**: `eth_sendRawTransactionSync` (EIP-7966) for instant receipts
- **RPC Patterns**: JSON-RPC batching, WebSocket keepalive, mini-block subscriptions
- **Storage**: Optimization patterns to avoid expensive SSTORE costs
- **Gas Model**: MegaEVM-specific costs and estimation strategies
- **Debugging**: mega-evme CLI for transaction replay and gas profiling
- **Security**: MegaETH-specific considerations and audit checklists

## Installation

### Quick Install (skills.sh)

```bash
npx skills add 0xBreadguy/megaeth-ai-developer-skills
```

### Manual Install

```bash
git clone https://github.com/0xBreadguy/megaeth-ai-developer-skills
# Copy to your agent's skills directory
```

### OpenClaw / ClawdHub

```bash
clawdhub install megaeth-developer
```

## Skill Structure

```
├── SKILL.md                  # Main skill (stack decisions, operating procedure)
├── wallet-operations.md      # Wallet setup, balances, transfers, swaps, bridging
├── frontend-patterns.md      # React/Next.js, WebSocket, real-time UX
├── rpc-methods.md            # RPC reference, rate limits, batching
├── smart-contracts.md        # MegaEVM patterns, volatile data, predeploys
├── storage-optimization.md   # SSTORE costs, Solady RedBlackTreeLib
├── gas-model.md              # Gas costs, estimation, base fee
├── testing.md                # mega-evme, Foundry, debugging
├── security.md               # Vulnerabilities and prevention
└── resources.md              # Links, tools, explorers, bridges, DEX
```

## Usage

Once installed, your AI agent will automatically use this skill when you ask about:

- Building dApps on MegaETH
- Transaction submission and confirmation
- Smart contract development with MegaEVM
- Storage optimization and gas costs
- Real-time WebSocket subscriptions
- Debugging failed transactions

### Example Prompts

```
"Set up a wallet for MegaETH"
"Send 0.1 ETH on MegaETH"
"Swap USDC for ETH on MegaETH"
"Bridge ETH from Ethereum to MegaETH"
"Set up a Next.js app with MegaETH wallet connection"
"Deploy a contract to MegaETH with Foundry"
"Why is my transaction using so much gas?"
"How do I subscribe to real-time mini-blocks?"
"Optimize this contract for MegaETH storage costs"
"Debug this failed transaction on MegaETH"
```

## Key Concepts

### Instant Transaction Receipts

MegaETH supports `eth_sendRawTransactionSync` (EIP-7966) — get your receipt in <10ms instead of polling:

```typescript
const receipt = await client.request({
  method: 'eth_sendRawTransactionSync',
  params: [signedTx],
})
// Receipt available immediately
```

### Storage Costs

New storage slots are expensive (2M+ gas). The skill teaches agents to:

- Use Solady's RedBlackTreeLib instead of mappings
- Design for slot reuse
- Consider off-chain storage for large data

### Gas Model

MegaETH has a stable 0.001 gwei base fee with no EIP-1559 adjustment. The skill teaches agents to:

- Skip unnecessary gas estimation
- Use remote estimation (MegaEVM costs differ from standard EVM)
- Hardcode gas limits for known operations

## Chain Configuration

| Network | Chain ID | RPC                               | Explorer                                    |
| ------- | -------- | --------------------------------- | ------------------------------------------- |
| Mainnet | 4326     | `https://mainnet.megaeth.com/rpc` | `https://mega.etherscan.io`                 |
| Testnet | 6343     | `https://carrot.megaeth.com/rpc`  | `https://megaeth-testnet-v2.blockscout.com` |

## Progressive Disclosure

The skill uses progressive disclosure — the main SKILL.md provides core guidance, and the agent reads specialized files only when needed for specific tasks. This keeps context efficient while providing deep expertise when required.

## Content Sources

This skill incorporates best practices from:

- [MegaETH Official Documentation](https://docs.megaeth.com)
- [MegaEVM Specification](https://github.com/megaeth-labs/mega-evm)
- [EIP-7966 (eth_sendRawTransactionSync)](https://ethereum-magicians.org/t/eip-7966-eth-sendrawtransactionsync-method/24640)
- MegaETH team technical guidance

## Contributing

Contributions welcome! Please ensure updates reflect current MegaETH ecosystem best practices.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
