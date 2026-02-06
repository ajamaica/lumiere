---
name: abstract-onboard
version: 1.6.0
description: Deploy smart contracts and bridge assets to Abstract (ZK Stack L2). Use when an agent needs to deploy contracts on Abstract, bridge ETH/tokens to Abstract, trade/swap tokens, place predictions on Myriad Markets, check balances, transfer assets, or interact with Abstract mainnet. Covers zksolc compilation, Hardhat deployment, Relay bridging, DEX trading (Kona, Aborean), Myriad prediction markets, and key contract addresses.
author: Big Hoss (@BigHossbot)
---

# Abstract Onboard

Everything an AI agent needs to operate on Abstract (ZK Stack L2).

## 🚀 New Agent? Start Here

```bash
# Check if you're ready to operate
node scripts/quick-start.js check <your-wallet-address>

# Or get the full setup guide
node scripts/quick-start.js
```

## Quick Start

### Create Abstract Global Wallet (AGW)

AGW is a smart contract wallet that earns XP on Abstract. Essential for agents!

**⚠️ CRITICAL: Understand the 3 layers first:**

```
Private Key → EOA (signer) → AGW (smart contract wallet)
```

**The correct funding flow:**

```
1. Fund EOA with small ETH (for gas)
2. Create/deploy AGW (EOA pays gas for first tx)
3. Fund AGW with your main balance
4. Everything runs through AGW from now on
```

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/create-agw.js
```

Your EOA becomes the signer, AGW is a separate smart contract address.

**⚠️ Version Warning:** Different `agw-client` versions may compute different AGW addresses! Always pin your version. See `references/agw.md` for details.

### Check Balances

```bash
node scripts/check-balances.js <wallet> all
```

### Bridge ETH to Abstract

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/relay-bridge.js --from base --amount 0.01
```

### Deploy a Contract

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/deploy-abstract.js ./artifacts/MyContract.json "constructor-arg"
```

### Transfer Tokens

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/transfer.js --to 0x... --amount 0.01           # ETH
node scripts/transfer.js --to 0x... --amount 100 --token USDC  # Token
```

### Swap Tokens

```bash
export WALLET_PRIVATE_KEY=0x...
export DEX_ROUTER=0x...  # Set DEX router address
node scripts/swap-tokens.js --from ETH --to USDC --amount 0.01
```

### DEX Trading (Kona & Aborean)

Abstract has multiple DEXs. Use the protocol-specific scripts for best results:

```bash
# Kona Finance (V2) - USDC → ETH
export WALLET_PRIVATE_KEY=0x...
node scripts/swap-kona.js

# Aborean (Velodrome-style) - when router is available
node scripts/swap-aborean.js

# Generic Uniswap V2
node scripts/swap-uniswap-v2.js
```

See `references/dex.md` for contract addresses and supported pools.

### Myriad Prediction Markets

Trade on Myriad Markets — the largest prediction market on Abstract (415K+ users, $100M+ volume).

```bash
# List open markets
node scripts/myriad-trade.js list

# Get market details
node scripts/myriad-trade.js info <marketId>

# Buy shares (place a prediction)
export WALLET_PRIVATE_KEY=0x...
node scripts/myriad-buy-direct.js <marketId> <outcomeId> <amount>

# Example: $1 USDC.e on "Yes" for market 765
node scripts/myriad-buy-direct.js 765 0 1
```

See `references/myriad.md` for contract addresses, ABI details, and token info.

### Call Any Contract

```bash
# Read
node scripts/call-contract.js --address 0x... --abi ./abi.json --function balanceOf --args 0x1234

# Write
export WALLET_PRIVATE_KEY=0x...
node scripts/call-contract.js --address 0x... --abi ./abi.json --function transfer --args 0x1234,100 --write
```

### Mint NFT

```bash
# Deploy SimpleNFT.sol first, then mint
export WALLET_PRIVATE_KEY=0x...

# Mint to existing contract
node scripts/mint-nft.js --contract 0x... --image QmIPFShash --to 0xRecipient --name "My NFT"
```

See `references/SimpleNFT.sol` for a basic NFT contract template.

### USDC Operations

```bash
# Check USDC balance
node scripts/usdc-ops.js balance <wallet>

# Transfer USDC
export WALLET_PRIVATE_KEY=0x...
node scripts/usdc-ops.js transfer <to> <amount>

# Approve spender
node scripts/usdc-ops.js approve <spender> <amount>

# Check allowance
node scripts/usdc-ops.js allowance <owner> <spender>
```

### Estimate Gas

```bash
# Get current gas prices
node scripts/estimate-gas.js

# Estimate transfer cost
node scripts/estimate-gas.js transfer <to> <amount>

# Estimate deployment cost
node scripts/estimate-gas.js deploy <bytecodeSize>
```

### Watch Events

```bash
# Watch new blocks
node scripts/watch-events.js blocks

# Watch ETH transfers to/from wallet
node scripts/watch-events.js transfers <wallet>

# Watch ERC20 transfers
node scripts/watch-events.js erc20 <token> <wallet>

# Watch contract events
node scripts/watch-events.js contract <address>
```

### Testnet Setup

```bash
# Get faucet instructions
node scripts/testnet-setup.js faucet

# Check testnet balance
node scripts/testnet-setup.js check <wallet>

# Verify testnet setup
node scripts/testnet-setup.js verify <wallet>
```

## Key Information

| Item               | Value                                        |
| ------------------ | -------------------------------------------- |
| Chain ID           | 2741                                         |
| RPC                | https://api.mainnet.abs.xyz                  |
| Explorer           | https://abscan.org                           |
| Bridge             | https://relay.link/bridge/abstract           |
| USDC               | `0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1` |
| WETH               | `0x3439153EB7AF838Ad19d56E1571FBD09333C2809` |
| Kona Router        | `0x441E0627Db5173Da098De86b734d136b27925250` |
| Uniswap V2 Router  | `0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c` |
| Myriad PM Contract | `0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289` |
| Myriad PTS Token   | `0x0b07cf011B6e2b7E0803b892d97f751659940F23` |
| Myriad API         | `https://api-v2.myriadprotocol.com`          |

## Scripts

| Script                 | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `quick-start.js`       | **START HERE** - Setup guide & health check       |
| `create-agw.js`        | Create Abstract Global Wallet (earns XP!)         |
| `check-balances.js`    | Check ETH and token balances                      |
| `relay-bridge.js`      | Bridge ETH from other chains                      |
| `bridge-usdc-relay.js` | Bridge USDC via Relay API                         |
| `deploy-abstract.js`   | Deploy contracts to Abstract (with verification!) |
| `verify-contract.js`   | Verify contract has bytecode (SAFETY CHECK)       |
| `transfer.js`          | Send ETH or tokens                                |
| `usdc-ops.js`          | USDC transfers, approvals, allowances             |
| `swap-tokens.js`       | Trade tokens via DEX (generic)                    |
| `swap-kona.js`         | Swap on Kona Finance (V2) ✅                      |
| `swap-aborean.js`      | Swap on Aborean (Velodrome-style)                 |
| `swap-uniswap-v2.js`   | Swap on Uniswap V2                                |
| `myriad-trade.js`      | List markets, get info (Myriad API)               |
| `myriad-buy-direct.js` | Place predictions on Myriad (on-chain) ✅         |
| `call-contract.js`     | Call any contract function                        |
| `mint-nft.js`          | Mint NFTs to existing contract                    |
| `estimate-gas.js`      | Estimate gas costs before transactions            |
| `watch-events.js`      | Monitor on-chain events in real-time              |
| `testnet-setup.js`     | Setup and verify testnet access                   |

## References

| File                 | Contents                                          |
| -------------------- | ------------------------------------------------- |
| `agw.md`             | Abstract Global Wallet guide (XP, activation)     |
| `dex.md`             | DEX contracts & swap patterns (Kona, Aborean)     |
| `myriad.md`          | Myriad prediction market contracts, ABI & trading |
| `hardhat.config.js`  | Working Hardhat config for Abstract               |
| `addresses.md`       | Key contract addresses                            |
| `troubleshooting.md` | Common errors and fixes                           |
| `SimpleNFT.sol`      | Basic NFT contract template                       |

## ⚠️ CRITICAL: Contract Deployment

Abstract is a zkSync-based chain. Standard EVM deployment methods DON'T WORK.

### What WORKS ✅

```javascript
// Use zksync-ethers (NOT viem, NOT standard ethers)
const { ContractFactory } = require('zksync-ethers')
const factory = new ContractFactory(abi, bytecode, wallet)
const contract = await factory.deploy(args)

// ALWAYS verify bytecode after deploy
const code = await provider.getCode(address)
if (code === '0x') throw new Error('Deploy failed!')
```

### What DOESN'T WORK ❌

```javascript
// DON'T use viem's deployContract
await walletClient.deployContract({...}); // Returns success but NO BYTECODE

// DON'T use standard ethers ContractFactory
// DON'T trust transaction success alone
```

### Deployment Checklist

- [ ] Compiled with zksolc (not standard solc)
- [ ] Using `zksync-ethers` ContractFactory
- [ ] Verify `eth_getCode != 0x` after deploy
- [ ] Test contract functions before sending tokens

## Common Issues

1. **Gas estimation fails** → Use Hardhat, not foundry-zksync
2. **Compiler errors** → Use Solidity 0.8.x with zksolc
3. **TX stuck** → Check gas price, verify on abscan.org
4. **Deploy succeeds but no bytecode** → Use zksync-ethers, not viem
5. **Tokens sent to empty address** → Always verify bytecode first!

See `references/troubleshooting.md` for detailed solutions.

## Dependencies

```bash
# Core dependencies
npm install ethers zksync-ethers viem

# For contract deployment
npm install @matterlabs/hardhat-zksync

# For AGW (Abstract Global Wallet) - PIN THE VERSION!
# Different versions compute different AGW addresses
npm install @abstract-foundation/agw-client@1.10.0
```

**⚠️ agw-client version warning:** Newer versions may use different factory contracts, computing different AGW addresses for the same EOA. If you change versions, verify your AGW address hasn't changed before sending funds!
