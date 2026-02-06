---
name: abstract-onboard
description: Deploy smart contracts and bridge assets to Abstract (ZK Stack L2). Use when an agent needs to deploy contracts on Abstract, bridge ETH/tokens to Abstract, trade/swap tokens, check balances, transfer assets, or interact with Abstract mainnet. Covers zksolc compilation, Hardhat deployment, Relay bridging, DEX trading, and key contract addresses.
---

# Abstract Onboard

Everything an agent needs to operate on Abstract.

## Quick Start

### Create Abstract Global Wallet (AGW)

AGW is a smart contract wallet that earns XP on Abstract. Essential for agents!

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/create-agw.js
```

Your EOA becomes the signer, AGW is a separate smart contract address.

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

### Call Any Contract

```bash
# Read
node scripts/call-contract.js --address 0x... --abi ./abi.json --function balanceOf --args 0x1234

# Write
export WALLET_PRIVATE_KEY=0x...
node scripts/call-contract.js --address 0x... --abi ./abi.json --function transfer --args 0x1234,100 --write
```

## Key Information

| Item     | Value                                        |
| -------- | -------------------------------------------- |
| Chain ID | 2741                                         |
| RPC      | https://api.mainnet.abs.xyz                  |
| Explorer | https://abscan.org                           |
| Bridge   | https://relay.link/bridge/abstract           |
| USDC     | `0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1` |
| WETH     | `0x3439153EB7AF838Ad19d56E1571FBD09333C2809` |

## Scripts

| Script               | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `create-agw.js`      | Create Abstract Global Wallet (earns XP!) |
| `check-balances.js`  | Check ETH and token balances              |
| `relay-bridge.js`    | Bridge ETH from other chains              |
| `deploy-abstract.js` | Deploy contracts to Abstract              |
| `transfer.js`        | Send ETH or tokens                        |
| `swap-tokens.js`     | Trade tokens via DEX                      |
| `call-contract.js`   | Call any contract function                |

## References

| File                 | Contents                                      |
| -------------------- | --------------------------------------------- |
| `agw.md`             | Abstract Global Wallet guide (XP, activation) |
| `hardhat.config.js`  | Working Hardhat config for Abstract           |
| `addresses.md`       | Key contract addresses                        |
| `troubleshooting.md` | Common errors and fixes                       |

## Common Issues

1. **Gas estimation fails** → Use Hardhat, not foundry-zksync
2. **Compiler errors** → Use Solidity 0.8.x with zksolc
3. **TX stuck** → Check gas price, verify on abscan.org

See `references/troubleshooting.md` for detailed solutions.

## Dependencies

```bash
# Core dependencies
npm install ethers zksync-ethers viem

# For contract deployment
npm install @matterlabs/hardhat-zksync

# For AGW (Abstract Global Wallet)
npm install @abstract-foundation/agw-client
```
