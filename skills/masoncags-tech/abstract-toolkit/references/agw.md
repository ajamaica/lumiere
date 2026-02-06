# Abstract Global Wallet (AGW)

## What is AGW?

AGW is a **smart contract wallet** that:

- Earns XP on Abstract for transactions
- Works across all Abstract applications
- Uses your EOA as the signer/owner
- Deploys on first transaction (counterfactual deployment)

## Key Differences from EOA

| Feature            | EOA                      | AGW                   |
| ------------------ | ------------------------ | --------------------- |
| Type               | Externally Owned Account | Smart Contract Wallet |
| Private Key        | Yes                      | No (uses signer EOA)  |
| XP Eligible        | ❌ No                    | ✅ Yes                |
| Gas Sponsorship    | ❌ No                    | ✅ Possible           |
| Batch Transactions | ❌ No                    | ✅ Yes                |

## Creating AGW

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/create-agw.js
```

The AGW address is **deterministic** - same EOA always produces same AGW address.

## AGW Address Derivation

Your AGW address is computed from:

- Your EOA address (signer)
- Abstract's AGW factory contract
- Salt/nonce values

## Activating AGW

The AGW smart contract is deployed on first transaction:

1. Fund your AGW with ETH (send from EOA or bridge)
2. Make any transaction from AGW
3. Contract deploys automatically
4. Start earning XP!

## Using AGW in Code

```javascript
const { createAbstractClient } = require('@abstract-foundation/agw-client')
const { privateKeyToAccount } = require('viem/accounts')

const signer = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY)

const client = await createAbstractClient({
  signer,
  chain: abstractMainnet,
  transport: http('https://api.mainnet.abs.xyz'),
})

// client.account.address = your AGW address
// All transactions go through AGW
```

## XP System

- Transactions from AGW earn XP
- XP can be used in Abstract ecosystem
- Tier progression: Bronze → Silver → Gold → Platinum
- Social connections may boost XP earning

## Dependencies

```bash
npm install @abstract-foundation/agw-client viem
```

## Links

- AGW Docs: https://docs.abs.xyz/abstract-global-wallet/overview
- AGW SDK: https://github.com/Abstract-Foundation/agw-sdk
- Abstract Portal: https://portal.abs.xyz
