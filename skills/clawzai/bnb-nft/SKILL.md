---
name: bnb-nft
description: NFT operations on BNB Chain — get NFT metadata, check ownership, list NFTs by owner, transfer ERC-721 tokens, get collection info. Use for any NFT-related tasks on BSC.
---

# BNB Chain NFT Skill

ERC-721 NFT operations on BNB Chain (BSC).

## Setup

Requires Node.js and ethers.js:

```bash
cd ~/.openclaw/workspace/skills/bnb-nft && npm install ethers --silent
```

## Configuration

For write operations (transfer, approve), set private key:

```bash
export BNB_PRIVATE_KEY="0x..."
```

Or pass with `--key` flag.

## Usage

All operations use: `nft.js`

### Get Collection Info

```bash
node nft.js collection <contract_address>
```

Returns name, symbol, total supply (if available).

### Get NFT Metadata

```bash
node nft.js metadata <contract_address> <token_id>
```

Returns owner, tokenURI, and fetched metadata (if URI is HTTP).

### Check NFT Owner

```bash
node nft.js owner <contract_address> <token_id>
```

### List NFTs Owned by Address

```bash
node nft.js owned <contract_address> <wallet_address> [--limit 100]
```

Scans token IDs to find NFTs owned by wallet. Use `--limit` to cap the scan range.

### Get Wallet's NFT Balance

```bash
node nft.js balance <contract_address> <wallet_address>
```

Returns count of NFTs owned in collection.

### Transfer NFT

```bash
node nft.js transfer <contract_address> <to_address> <token_id> [--key <private_key>]
```

### Approve NFT for Transfer

```bash
node nft.js approve <contract_address> <spender_address> <token_id> [--key <private_key>]
```

### Set Approval for All

```bash
node nft.js approve-all <contract_address> <operator_address> <true|false> [--key <private_key>]
```

### Check if Approved

```bash
node nft.js is-approved <contract_address> <token_id> <spender_address>
```

## Popular NFT Collections (BSC Mainnet)

| Collection      | Address                                      |
| --------------- | -------------------------------------------- |
| Pancake Squad   | `0x0a8901b0E25DEb55A87524f0cC164E9644020EBA` |
| Pancake Bunnies | `0xDf7952B35f24aCF7fC0487D01c8d5690a60DBa07` |
| BakerySwap      | `0x5d0915E32b1fb1144f27B87C9f65AC3f661C9e6D` |

## Security Notes

- **Never commit private keys** to git
- Always verify contract addresses before interacting
- Use testnet for testing transfers first
- Check approval status before marketplace listings
