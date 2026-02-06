# Resources

## Official Documentation

- **MegaETH Docs**: https://docs.megaeth.com
- **Real-time API**: https://docs.megaeth.com/realtime-api
- **Testnet Guide**: https://docs.megaeth.com/testnet
- **Frontier (Mainnet)**: https://docs.megaeth.com/frontier

## Source Code

- **MegaEVM**: https://github.com/megaeth-labs/mega-evm
- **MegaEVM Spec (MiniRex)**: https://github.com/megaeth-labs/mega-evm/blob/main/specs/MiniRex.md

## Token List

**Official:** https://github.com/megaeth-labs/mega-tokenlist

The canonical source for verified token addresses, symbols, decimals, and logos on MegaETH. Use this repo to:

- Look up token contract addresses
- Get token metadata (name, symbol, decimals)
- Access official token logos
- Verify token legitimacy

## Tools

### Warren Deploy (On-Chain Websites)

Deploy websites and files permanently on MegaETH using SSTORE2:

- **Skill**: https://clawdhub.ai/planetai87/warren-deploy
- **Website**: https://megawarren.xyz
- **Install**: `clawdhub install warren-deploy`

Features:

- SSTORE2 bytecode storage (cheap reads)
- Automatic chunking for large files (up to 500KB)
- MegaETH-specific gas estimation
- Stress test workflows

### mega-evme CLI

Transaction replay and debugging:

```bash
git clone https://github.com/megaeth-labs/mega-evm
cd mega-evm/bin/mega-evme
cargo build --release
```

### Gas Profiler

Opcode-level gas analysis:
https://github.com/megaeth-labs/mega-evm/blob/main/scripts/trace_opcode_gas.py

## Block Explorers

| Network | Explorer                                  |
| ------- | ----------------------------------------- |
| Mainnet | https://mega.etherscan.io                 |
| Testnet | https://megaeth-testnet-v2.blockscout.com |
| Uptime  | https://uptime.megaeth.com                |

## RPC Providers

| Provider  | Type    | Notes           |
| --------- | ------- | --------------- |
| MegaETH   | Public  | Rate limited    |
| Alchemy   | Managed | Geo-distributed |
| QuickNode | Managed | Geo-distributed |

**Mainnet**: `https://mainnet.megaeth.com/rpc`
**Testnet**: `https://carrot.megaeth.com/rpc`

## Standards

### EIP-6909 (Minimal Multi-Token)

Simplified alternative to ERC-1155 — no callbacks, minimal interface, granular approvals:
https://eips.ethereum.org/EIPS/eip-6909

**Why use on MegaETH:**

- Single contract for multiple tokens (fewer SSTORE operations)
- No mandatory callbacks (less gas)
- Solady provides gas-optimized implementation

### EIP-7966 (eth_sendRawTransactionSync)

Synchronous transaction submission with immediate receipt:
https://ethereum-magicians.org/t/eip-7966-eth-sendrawtransactionsync-method/24640

**Note:** MegaETH originally created `realtime_sendRawTransaction`. The `eth_sendRawTransactionSync` method was later standardized as EIP-7966. MegaETH proxies both — they are functionally equivalent. Use `eth_sendRawTransactionSync` for cross-chain compatibility.

Supported in:

- viem (native)
- wagmi (native)
- ethers.js (via custom provider)

## Indexers

### Envio HyperSync

High-performance historical data queries:
https://docs.envio.dev/docs/HyperSync/overview

Recommended for:

- Large `eth_getLogs` queries
- Historical trade data
- Event indexing

## Libraries

### Solady

Gas-optimized Solidity utilities:
https://github.com/Vectorized/solady

Key for MegaETH:

- `RedBlackTreeLib` — storage-efficient mappings
- `SafeTransferLib` — optimized token transfers

### viem

TypeScript Ethereum library:
https://viem.sh

MegaETH chain config:

```typescript
import { defineChain } from 'viem'

export const megaeth = defineChain({
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.megaeth.com/rpc'] },
  },
})
```

## DEX Aggregator

### Kyber Network

MegaETH uses Kyber Network for token swaps:

- **Aggregator API**: `https://aggregator-api.kyberswap.com/megaeth/api/v1`
- **Docs**: https://docs.kyberswap.com/kyberswap-solutions/kyberswap-aggregator

Features:

- Best-route across multiple DEXs
- MEV protection
- Gas-optimized execution

## Bridges

### Canonical Bridge (OP Stack)

Ethereum ↔ MegaETH:

| Contract              | Address (Ethereum)                           |
| --------------------- | -------------------------------------------- |
| L1StandardBridgeProxy | `0x0CA3A2FBC3D770b578223FBB6b062fa875a2eE75` |
| OptimismPortalProxy   | `0x7f82f57F0Dd546519324392e408b01fcC7D709e8` |

Simple ETH bridge: Send ETH directly to L1StandardBridgeProxy.

## Predeployed Contracts (MegaETH)

| Contract                 | Address                                      |
| ------------------------ | -------------------------------------------- |
| WETH9                    | `0x4200000000000000000000000000000000000006` |
| Multicall3               | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| High-Precision Timestamp | `0x6342000000000000000000000000000000000002` |
| MEGA Token               | `0x28B7E77f82B25B95953825F1E2eA0E36c1c29861` |

See OP Stack docs for full predeploy list.

## Security

### Auditors

Recommended by MegaETH team:

- **Spearbit**: https://spearbit.com
- **Cantina**: https://cantina.xyz

### Monitoring

Consider runtime monitoring for:

- Unusual gas patterns
- Failed transaction spikes
- Storage cost anomalies

## Community

- **Discord**: (contact MegaETH team)
- **Twitter**: @megaeth_labs

## Quick Reference

```bash
# Check balance
cast balance <address> --rpc-url https://mainnet.megaeth.com/rpc

# Send transaction
cast send <to> --value 0.01ether --rpc-url https://mainnet.megaeth.com/rpc

# Call contract
cast call <contract> "method(args)" --rpc-url https://mainnet.megaeth.com/rpc

# Get gas price (always 0.001 gwei)
cast gas-price --rpc-url https://mainnet.megaeth.com/rpc

# Deploy with Foundry
forge script Deploy.s.sol --rpc-url https://mainnet.megaeth.com/rpc --broadcast --skip-simulation
```
