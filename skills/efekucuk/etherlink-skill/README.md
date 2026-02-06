# Openclaw Etherlink Skill 🤖

A [ClawdHub](https://clawdhub.com) skill for interacting with **Etherlink** - an EVM-compatible Layer 2 blockchain built on Tezos.

## What's Included

- `SKILL.md` - Agent instructions for Etherlink operations
- `references/networks.md` - Network configs, RPC endpoints, MetaMask setup
- `references/differences.md` - How Etherlink differs from standard EVM chains
- `references/mcp-setup.md` - MCP server configuration guide
- `scripts/test-connection.sh` - Quick RPC health check

## Networks

| Network           | Chain ID | RPC                                  | Explorer                                                                     |
| ----------------- | -------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Mainnet           | 42793    | https://node.mainnet.etherlink.com   | [explorer.etherlink.com](https://explorer.etherlink.com)                     |
| Shadownet Testnet | 127823   | https://node.shadownet.etherlink.com | [shadownet.explorer.etherlink.com](https://shadownet.explorer.etherlink.com) |

**Native Currency:** XTZ (18 decimals)

## Installation

### Via ClawdHub

```bash
clawdhub install etherlink
```
