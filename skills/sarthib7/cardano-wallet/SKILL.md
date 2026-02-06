---
name: cardano-wallet
description: Generate, manage, and fund Cardano wallets for OpenClaw agents
homepage: https://masumi.network
user-invocable: true
metadata: { 'openclaw': { 'requires': { 'bins': ['node'], 'env': [] }, 'emoji': '💳' } }
---

# Cardano Wallet Skill for OpenClaw

**Generate, restore, and manage Cardano wallets with QR code funding support**

## Overview

The Cardano Wallet skill provides tools for AI agents to:

- Generate new Cardano wallets (24-word mnemonic)
- Restore wallets from existing mnemonics
- Generate QR codes for easy wallet funding
- Check wallet balances (requires Blockfrost API key)
- Securely backup wallet credentials

## Tools

### `cardano_generate_wallet`

Generate a new Cardano wallet with 24-word mnemonic phrase.

**Parameters:**

- `network` (optional): "Preprod" or "Mainnet" (default: "Preprod")

**Returns:**

- `address`: Cardano address (addr1...)
- `vkey`: Payment verification key
- `credentialsPath`: Path to encrypted credentials

**Example:**

```typescript
const wallet = await cardano_generate_wallet({ network: 'Preprod' })
console.log('Address:', wallet.address)
```

### `cardano_restore_wallet`

Restore a wallet from existing mnemonic phrase.

**Parameters:**

- `mnemonic` (required): 24-word mnemonic phrase
- `network` (optional): "Preprod" or "Mainnet"
- `agentIdentifier` (optional): Identifier to save credentials

**Example:**

```typescript
const wallet = await cardano_restore_wallet({
  mnemonic: 'word1 word2 ... word24',
  network: 'Preprod',
})
```

### `cardano_generate_funding_qr`

Generate QR code for wallet funding. Returns QR code as data URL.

**Parameters:**

- `address` (optional): Cardano address
- `agentIdentifier` (optional): Wallet identifier
- `network` (optional): "Preprod" or "Mainnet"

**Returns:**

- `qrDataUrl`: QR code as data URL (can be displayed in image)
- `address`: Wallet address
- `faucetUrl`: Preprod faucet URL (if Preprod network)

**Example:**

```typescript
const qr = await cardano_generate_funding_qr({
  agentIdentifier: 'my-wallet',
  network: 'Preprod',
})
// Display qr.qrDataUrl as image
```

### `cardano_get_wallet_balance`

Get wallet balance in ADA and lovelace. Requires Blockfrost API key.

**Parameters:**

- `agentIdentifier` (required): Wallet identifier
- `network` (optional): "Preprod" or "Mainnet"
- `blockfrostApiKey` (optional): Blockfrost API key (or use env var)

**Environment Variables:**

- `BLOCKFROST_API_KEY`: Blockfrost API key
- `BLOCKFROST_PREPROD_API_KEY`: Preprod API key
- `BLOCKFROST_MAINNET_API_KEY`: Mainnet API key

**Example:**

```typescript
const balance = await cardano_get_wallet_balance({
  agentIdentifier: 'my-wallet',
  network: 'Preprod',
})
console.log('Balance:', balance.ada, 'ADA')
```

### `cardano_backup_wallet`

Securely backup wallet credentials (encrypted).

**Parameters:**

- `agentIdentifier` (required): Wallet identifier
- `network` (optional): "Preprod" or "Mainnet"

**Returns:**

- `backupData`: Encrypted backup JSON

## Wallet Funding Workflow

1. **Generate wallet:**

   ```typescript
   const wallet = await cardano_generate_wallet({ network: 'Preprod' })
   ```

2. **Generate QR code:**

   ```typescript
   const qr = await cardano_generate_funding_qr({
     address: wallet.address,
     network: 'Preprod',
   })
   ```

3. **Display QR code** (for human to scan and fund)

4. **For Preprod:** Use faucet at https://docs.cardano.org/cardano-testnet/tools/faucet

5. **Check balance:**
   ```typescript
   const balance = await cardano_get_wallet_balance({
     agentIdentifier: 'wallet-id',
     network: 'Preprod',
     blockfrostApiKey: 'your-api-key',
   })
   ```

## Credential Storage

Credentials are stored encrypted at:

- `~/.openclaw/credentials/cardano-wallet/`

Files are encrypted with AES-256-GCM and have permissions 600 (owner read/write only).

## Security Notes

- **Never share your mnemonic** - it provides full access to your wallet
- **Backup your mnemonic securely** - use `cardano_backup_wallet` or save manually
- **Use Preprod for testing** - Mainnet uses real ADA
- **Encryption key**: Set `MASUMI_ENCRYPTION_KEY` environment variable for secure encryption

## Dependencies

- `@meshsdk/core`: Wallet operations
- `qrcode`: QR code generation
- `@blockfrost/blockfrost-js`: Balance queries (optional)

## Examples

See `examples/wallet-generation.ts` for complete examples.
