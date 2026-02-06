# Wallet API

The Wallet module manages Aleph (ℵ) token balance, transactions, and staking for tier-based access.

## Overview

The wallet system enables:

- **Token Management**: Balance tracking and transfers
- **Staking**: Lock tokens for tier upgrades and benefits
- **Gas Estimation**: Predict operation costs
- **Transaction History**: Complete record of all operations

## Staking Tiers

| Tier         | Minimum Stake | Storage | Daily Messages | Features                           |
| ------------ | ------------- | ------- | -------------- | ---------------------------------- |
| **Neophyte** | 0ℵ            | 10MB    | 100            | Basic chat, public content         |
| **Adept**    | 100ℵ          | 100MB   | 1,000          | + Private rooms, file sharing      |
| **Magus**    | 1,000ℵ        | 1GB     | 10,000         | + Priority routing, custom profile |
| **Archon**   | 10,000ℵ       | 10GB    | 100,000        | + Governance, node rewards         |

## Classes

### Wallet

The main wallet class for token management.

```javascript
const { Wallet } = require('@sschepis/alephnet-node/lib/wallet')
```

#### Constructor

```javascript
new Wallet(options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nodeId` | string | Yes | Owner's node ID |
| `storagePath` | string | No | Path to store wallet data |
| `identity` | Identity | No | Identity for transaction signing |

**Example:**

```javascript
const wallet = new Wallet({
  nodeId: identity.nodeId,
  storagePath: './data/wallet.json',
  identity: identity,
})
```

#### Properties

| Property        | Type   | Description               |
| --------------- | ------ | ------------------------- |
| `balance`       | number | Current available balance |
| `stakedAmount`  | number | Amount currently staked   |
| `totalReceived` | number | Total tokens received     |
| `totalSent`     | number | Total tokens sent         |
| `totalGasSpent` | number | Total gas spent           |

#### Methods

##### `getTier()`

Get current staking tier and benefits.

```javascript
wallet.getTier()
```

**Returns:** `Object`

```javascript
{
  name: string,           // 'Neophyte' | 'Adept' | 'Magus' | 'Archon'
  minStake: number,       // Minimum stake for this tier
  storageMB: number,      // Storage allowance
  dailyMessages: number,  // Daily message limit
  features: string[],     // Available features
  currentStake: number,   // Current staked amount
  nextTier: {
    name: string,
    requiredStake: number,
    additional: number    // Additional tokens needed
  } | null
}
```

**Example:**

```javascript
const tier = wallet.getTier()
console.log(`Current tier: ${tier.name}`)
console.log(`Storage: ${tier.storageMB}MB`)
if (tier.nextTier) {
  console.log(`Stake ${tier.nextTier.additional}ℵ more to reach ${tier.nextTier.name}`)
}
```

---

##### `estimateGas(operationType, [complexity])`

Estimate gas cost for an operation.

```javascript
wallet.estimateGas(operationType, complexity)
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `operationType` | string | - | Type of operation |
| `complexity` | number | 1 | Operation complexity multiplier |

**Operation Types:**

- `token_transfer` - Token transfer
- `stake` - Staking operation
- `unstake` - Unstaking operation
- `content_store` - Storing content
- `content_retrieve` - Retrieving content
- `message_send` - Sending a message

**Returns:** `Object`

```javascript
{
  baseCost: number,
  subsidizedCost: number,  // After coherence discount
  coherenceDiscount: number
}
```

---

##### `canAfford(operationType, [complexity])`

Check if wallet can afford an operation.

```javascript
wallet.canAfford(operationType, complexity)
```

**Returns:** `Object`

```javascript
{
  canAfford: boolean,
  balance: number,
  cost: number,
  remaining: number
}
```

---

##### `transfer(toNodeId, amount, [memo])`

Transfer tokens to another wallet.

```javascript
wallet.transfer(toNodeId, amount, memo)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `toNodeId` | string | Yes | Recipient's node ID |
| `amount` | number | Yes | Amount to transfer |
| `memo` | string | No | Optional transaction memo |

**Returns:** `Transaction`

**Throws:** `Error` if insufficient balance or transferring to self

**Example:**

```javascript
try {
  const tx = wallet.transfer('recipient-node-id', 50, 'Payment for services')
  console.log(`Transfer complete: ${tx.id}`)
  console.log(`New balance: ${wallet.balance}`)
} catch (e) {
  console.error(`Transfer failed: ${e.message}`)
}
```

---

##### `stake(amount, lockDays)`

Stake tokens for tier upgrade.

```javascript
wallet.stake(amount, lockDays)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `amount` | number | Amount to stake |
| `lockDays` | number | Lock duration in days (minimum 1) |

**Returns:** `Transaction`

**Example:**

```javascript
// Stake 100ℵ for 30 days to reach Adept tier
const tx = wallet.stake(100, 30)
console.log(`Staked! New tier: ${wallet.getTier().name}`)
```

---

##### `unstake([amount])`

Unstake tokens (after lock period expires).

```javascript
wallet.unstake(amount)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `amount` | number | Amount to unstake (defaults to all) |

**Returns:** `Transaction`

**Throws:** `Error` if stake is still locked

---

##### `claimFaucet([amount])`

Claim tokens from the faucet (for testing/onboarding).

```javascript
wallet.claimFaucet(amount)
```

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `amount` | number | 100 | Amount to claim |

**Returns:** `Transaction`

---

##### `getHistory(options)`

Get transaction history.

```javascript
wallet.getHistory(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `type` | string | Filter by transaction type |
| `limit` | number | Maximum results (default: 50) |
| `offset` | number | Offset for pagination |

**Transaction Types:**

- `transfer` - Token transfers
- `stake` - Staking operations
- `unstake` - Unstaking operations
- `reward` - Rewards received
- `gas` - Gas deductions
- `faucet` - Faucet claims

**Returns:** `Array<Object>` - Transactions sorted newest first

---

##### `getStatus()`

Get full wallet status.

```javascript
wallet.getStatus()
```

**Returns:** `Object`

```javascript
{
  nodeId: string,
  balance: number,
  stakedAmount: number,
  stakeLockDays: number,
  tier: string,
  tierFeatures: string[],
  nextTier: object | null,
  stats: {
    totalReceived: number,
    totalSent: number,
    totalGasSpent: number,
    transactionCount: number
  }
}
```

---

### Transaction

Represents a token transaction.

```javascript
const { Transaction } = require('@sschepis/alephnet-node/lib/wallet')
```

#### Properties

| Property      | Type   | Description                          |
| ------------- | ------ | ------------------------------------ |
| `id`          | string | Unique transaction ID                |
| `type`        | string | Transaction type                     |
| `from`        | string | Sender node ID                       |
| `to`          | string | Recipient node ID                    |
| `amount`      | number | Transaction amount                   |
| `memo`        | string | Optional memo                        |
| `gasUsed`     | number | Gas used                             |
| `status`      | string | 'pending' \| 'confirmed' \| 'failed' |
| `timestamp`   | number | Creation timestamp                   |
| `confirmedAt` | number | Confirmation timestamp               |
| `signature`   | string | Transaction signature                |
| `error`       | string | Error message if failed              |

---

### WalletManager

Manages wallets across the network.

```javascript
const { WalletManager, getWalletManager } = require('@sschepis/alephnet-node/lib/wallet')
```

#### Methods

##### `getWallet(nodeId, [options])`

Get or create a wallet for a node.

```javascript
manager.getWallet(nodeId, options)
```

**Returns:** `Wallet`

---

##### `transfer(fromNodeId, toNodeId, amount, [memo])`

Execute a transfer between wallets.

```javascript
manager.transfer(fromNodeId, toNodeId, amount, memo)
```

**Returns:** `Transaction`

---

##### `getNetworkStats()`

Get total network token statistics.

```javascript
manager.getNetworkStats()
```

**Returns:** `Object`

```javascript
{
  walletCount: number,
  totalBalance: number,
  totalStaked: number,
  totalCirculating: number
}
```

---

## Events

The Wallet class emits the following events:

| Event      | Payload                                                           | Description       |
| ---------- | ----------------------------------------------------------------- | ----------------- |
| `transfer` | `{ to, amount, txId, newBalance }`                                | Outgoing transfer |
| `received` | `{ from, amount, txId, newBalance }`                              | Incoming transfer |
| `staked`   | `{ amount, lockDays, totalStaked, newTier, txId }`                | Tokens staked     |
| `unstaked` | `{ amount, netReceived, gasCost, remainingStake, newTier, txId }` | Tokens unstaked   |
| `faucet`   | `{ amount, newBalance, txId }`                                    | Faucet claimed    |

---

## Gas Costs

Typical gas costs for operations:

| Operation      | Base Cost | Notes                          |
| -------------- | --------- | ------------------------------ |
| Token Transfer | 0.01ℵ     | + complexity for large amounts |
| Stake          | 0.01ℵ     | Fixed cost                     |
| Unstake        | 0.01ℵ     | Deducted from unstaked amount  |
| Store Content  | 0.001ℵ    | Per KB stored                  |
| Send Message   | 0.0001ℵ   | Per message                    |

Gas costs are subsidized based on:

- **Coherence Level**: Higher coherence = lower costs
- **Staking Tier**: Higher tiers get discounts
- **Network Load**: Variable based on network activity
