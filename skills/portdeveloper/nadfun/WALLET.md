# Wallet Skill - Private Key & Address Generation

A guide to wallet generation and management using viem.

## Prerequisites

```bash
npm install viem
```

---

## 1. Generate New Wallet

Generate a new random private key and address.

```typescript
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

// Generate random private key
const privateKey = generatePrivateKey()
// => '0x...' (64 hex characters)

// Derive account from private key
const account = privateKeyToAccount(privateKey)

console.log('Private Key:', privateKey)
console.log('Address:', account.address)
```

---

## 2. Import Existing Private Key

Restore an account from an existing private key.

```typescript
import { privateKeyToAccount } from 'viem/accounts'

const privateKey = '0x...' // Your private key (0x + 64 hex)
const account = privateKeyToAccount(privateKey)

console.log('Address:', account.address)
```

---

## 3. Complete Example

```typescript
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { monadTestnet } from 'viem/chains'

// Generate new wallet
const privateKey = generatePrivateKey()
const account = privateKeyToAccount(privateKey)

console.log('=== New Wallet Generated ===')
console.log('Private Key:', privateKey)
console.log('Address:', account.address)

// Create wallet client for signing transactions
const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http('https://monad-testnet.drpc.org'),
})

console.log('Wallet client ready for chain:', walletClient.chain.name)
```

---

## 4. Type Reference

```typescript
import type { PrivateKeyAccount, Address, Hex } from 'viem'

// Private key type
type PrivateKey = `0x${string}` // 0x + 64 hex characters

// Account from private key
const account: PrivateKeyAccount = privateKeyToAccount(privateKey)

// Account properties
account.address    // Address (0x + 40 hex)
account.publicKey  // Hex
account.source     // 'privateKey'
account.type       // 'local'

// Signing methods
account.signMessage({ message: 'Hello' })
account.signTransaction({ ... })
account.signTypedData({ ... })
```

---

## Security Notes

- **NEVER** hardcode private keys in your code.
- Use environment variables or a secret manager.
- Do not print private keys to logs, except in a development environment.

```typescript
// Good: Use environment variable
const privateKey = process.env.PRIVATE_KEY as `0x${string}`

// Bad: Hardcoded
const privateKey = '0xabc123...' // Never do this in production!
```

---

## See Also

- **AGENT-API.md** - REST API for trading data
- **CREATE.md** - Token creation
- **TRADING.md** - On-chain trading
