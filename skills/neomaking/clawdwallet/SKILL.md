---
name: clawdwallet
description: Install and control ClawdWallet - a multi-chain Web3 wallet Chrome extension controlled by Clawdbot agents. Use when setting up agent-controlled wallet, connecting to dApps, signing transactions, or managing crypto across 20+ chains (EVM, Bitcoin, Solana, Cosmos). Powered by ShapeShift hdwallet.
---

# ClawdWallet

Multi-chain wallet extension your agent controls via WebSocket.

## Quick Install

```bash
# Clone and build
git clone https://github.com/NeOMakinG/clawdwallet.git
cd clawdwallet
npm install
npm run build

# Or use pre-built dist/ folder directly
```

### Load in Chrome

1. `chrome://extensions` → Enable **Developer mode**
2. **Load unpacked** → select `dist/` folder
3. Click extension icon → set WebSocket URL (default: `ws://localhost:3033/clawdwallet`)

## Clawdbot Gateway Config

Add to your gateway config:

```yaml
extensions:
  clawdwallet:
    enabled: true
```

## Agent Commands

### Initialize with existing seed

```json
{ "type": "init_wallet", "mnemonic": "your twenty four words..." }
```

### Generate new wallet

```json
{ "type": "generate_wallet" }
```

Returns addresses for all supported chains.

### Approve dApp request

```json
{ "type": "sign_and_respond", "requestId": "uuid" }
```

### Reject request

```json
{ "type": "reject_request", "requestId": "uuid", "reason": "Looks suspicious" }
```

### Check status

```json
{ "type": "get_status" }
```

## Incoming Requests

When dApp requests signature, you receive:

```json
{
  "type": "wallet_request",
  "id": "uuid",
  "chain": "ethereum",
  "method": "eth_sendTransaction",
  "params": [{ "to": "0x...", "value": "0x..." }],
  "origin": "https://app.uniswap.org"
}
```

Review and approve/reject based on context.

## Supported Chains

| Family | Chains                                                              |
| ------ | ------------------------------------------------------------------- |
| EVM    | Ethereum, Polygon, Optimism, Arbitrum, Base, Avalanche, Gnosis, BSC |
| UTXO   | Bitcoin, Litecoin, Dogecoin, Bitcoin Cash                           |
| Cosmos | Cosmos Hub, Osmosis, THORChain, Mayachain                           |
| Other  | Solana, TON, Near, Sui, Tron                                        |

## Security Notes

- Only use with trusted agents
- Consider dedicated wallet for agent operations
- Never expose mnemonic or WebSocket URL publicly
