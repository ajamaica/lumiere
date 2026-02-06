# Abstract Global Wallet (AGW)

## What is AGW?

AGW is a **smart contract wallet** that:

- Earns XP on Abstract for transactions
- Works across all Abstract applications
- Uses your EOA as the signer/owner
- Deploys on first transaction (counterfactual deployment)

## ⚠️ CRITICAL: The 3-Layer Architecture

Understanding this prevents lost funds:

```
Private Key → EOA (signer) → AGW (smart contract wallet)
```

| Layer           | What It Is                | Role                                                                                                     |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Private Key** | The secret 256-bit number | Never leaves your keychain. Signs everything.                                                            |
| **EOA**         | Externally Owned Account  | Derived from private key. On normal EVMs this IS your wallet. On Abstract, it's just the signer.         |
| **AGW**         | Abstract Global Wallet    | Smart contract deployed on Abstract. Your PUBLIC wallet address. Earns XP, batched txs, gas sponsorship. |

## Key Differences from EOA

| Feature            | EOA                      | AGW                   |
| ------------------ | ------------------------ | --------------------- |
| Type               | Externally Owned Account | Smart Contract Wallet |
| Private Key        | Yes                      | No (uses signer EOA)  |
| XP Eligible        | ❌ No                    | ✅ Yes                |
| Gas Sponsorship    | ❌ No                    | ✅ Possible           |
| Batch Transactions | ❌ No                    | ✅ Yes                |

## ⚠️ CRITICAL: Funding Flow

**The EOA must have gas BEFORE you can deploy the AGW.**

```
1. Create EOA (from private key)
2. Fund EOA with small amount of ETH (for gas)
3. Create AGW (deploys on first tx, EOA pays gas)
4. Fund AGW with your main balance
5. Everything runs through AGW from now on
```

The AGW address is **deterministic** - computed from your EOA the moment it exists. But the smart contract doesn't actually deploy until you make your first transaction.

## Creating AGW

```bash
export WALLET_PRIVATE_KEY=0x...
node scripts/create-agw.js
```

The AGW address is **deterministic** - same EOA always produces same AGW address.

## ⚠️ WARNING: Library Version Drift

**Different versions of `@abstract-foundation/agw-client` may compute DIFFERENT AGW addresses for the same EOA!**

This happens because newer versions may use different factory contracts.

Example:

- v0.1.8 computed address `0xC28E...`
- v1.10.0 computed address `0xA0cC...`
- Funds sent to the old address are **stranded**

**Always pin your agw-client version:**

```bash
npm install @abstract-foundation/agw-client@1.10.0
```

If you change versions, re-run `create-agw.js` and verify your AGW address hasn't changed before sending funds.

## AGW Address Derivation

Your AGW address is computed from:

- Your EOA address (signer)
- Abstract's AGW factory contract address
- Salt/nonce values

The address is **deterministic** - it's the same for a given EOA, whether the AGW exists or not. It's like a "reserved" address. You CAN send funds to it before deployment - they'll just sit there waiting.

## Activating AGW

The AGW smart contract deploys on your first transaction:

1. **Fund your EOA** with a tiny amount of ETH (for gas)
2. **Make first AGW transaction** - EOA signs, pays gas, AGW contract deploys
3. **Fund your AGW** with your main balance
4. **All future transactions** run through AGW
5. Start earning XP!

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
