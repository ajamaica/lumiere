# Kaspa WASM SDK (JavaScript/TypeScript)

The Kaspa WASM SDK provides a WebAssembly-based interface for interacting with the Kaspa blockchain in JavaScript and TypeScript environments.

## Installation

```bash
npm install kaspa-wasm
# or
yarn add kaspa-wasm
```

## Network Types

```typescript
import { NetworkType } from 'kaspa-wasm'

NetworkType.Mainnet // Production network
NetworkType.Testnet // Test network
NetworkType.Devnet // Development network
```

## Core Classes

### PrivateKey

Represents a private key for signing transactions.

```typescript
import { PrivateKey, NetworkType } from 'kaspa-wasm'

// Generate a random private key
const privateKey = PrivateKey.random(NetworkType.Mainnet)

// Import from WIF (Wallet Import Format)
const privateKeyFromWif = PrivateKey.fromWif('Kx...', NetworkType.Mainnet)

// Get public key
const publicKey = privateKey.toPublicKey()

// Export to WIF
const wif = privateKey.toWif()
```

### PublicKey

Represents a public key derived from a private key.

```typescript
import { PublicKey, NetworkType } from 'kaspa-wasm'

// From private key
const publicKey = privateKey.toPublicKey()

// Generate address
const address = publicKey.toAddress(NetworkType.Mainnet)

// Serialize
const serialized = publicKey.toString()
```

### Address

Represents a Kaspa address.

```typescript
import { Address, NetworkType } from 'kaspa-wasm'

// From string
const address = Address.fromString('kaspa:qqkqkzjvr7zwxxmjxjkmxx')

// Validate
const isValid = Address.validate('kaspa:qqkqkzjvr7zwxxmjxjkmxx', NetworkType.Mainnet)

// Get string representation
const addressString = address.toString()

// Get version
const version = address.getVersion()

// Get prefix
const prefix = address.getPrefix()
```

### Transaction

Represents a Kaspa transaction.

```typescript
import { Transaction } from 'kaspa-wasm'

// Create a new transaction
const tx = new Transaction({
  version: 0,
  inputs: [],
  outputs: [],
  lockTime: 0,
  subnetworkId: '00000000000000000000000000000000',
  gas: 0,
  payload: '',
})

// Get transaction ID
const txId = tx.id()

// Serialize
const serialized = tx.serialize()

// Deserialize
const txFromBytes = Transaction.deserialize(serialized)
```

### TransactionInput

Represents a transaction input (spending a UTXO).

```typescript
import { TransactionInput, Outpoint } from 'kaspa-wasm'

const input = new TransactionInput({
  previousOutpoint: new Outpoint({
    transactionId: 'abcd1234...',
    index: 0,
  }),
  signatureScript: '',
  sequence: 0,
  sigOpCount: 1,
})
```

### TransactionOutput

Represents a transaction output (creating a UTXO).

```typescript
import { TransactionOutput, ScriptPublicKey } from 'kaspa-wasm'

const output = new TransactionOutput({
  value: 1000000000n, // Amount in sompi
  scriptPublicKey: new ScriptPublicKey({
    version: 0,
    script: '76a914...', // hex-encoded script
  }),
})
```

### Outpoint

References a specific output in a transaction.

```typescript
import { Outpoint } from 'kaspa-wasm'

const outpoint = new Outpoint({
  transactionId: 'abcd1234...',
  index: 0,
})
```

### ScriptPublicKey

Represents the locking script for an output.

```typescript
import { ScriptPublicKey, Address, NetworkType } from 'kaspa-wasm'

// Create from address
const address = Address.fromString('kaspa:qqkqkzjvr7zwxxmjxjkmxx')
const scriptPublicKey = address.toScriptPublicKey()

// Or manually
const script = new ScriptPublicKey({
  version: 0,
  script: '76a914...',
})
```

## RPC Client

### RpcClient

WebSocket-based RPC client for interacting with Kaspa nodes.

```typescript
import { RpcClient, NetworkType } from 'kaspa-wasm'

const rpc = new RpcClient({
  url: 'wss://api.kaspa.org',
  network: NetworkType.Mainnet,
})

// Connect
await rpc.connect()

// Check connection
const isConnected = rpc.isConnected()

// Disconnect
await rpc.disconnect()
```

### Balance Operations

```typescript
// Get balance for single address
const balance = await rpc.getBalanceByAddress({
  address: 'kaspa:qqkqkzjvr7zwxxmjxjkmxx',
})

// Get balances for multiple addresses
const balances = await rpc.getBalancesByAddresses({
  addresses: ['kaspa:qqkqkzjvr7zwxxmjxjkmxx', 'kaspa:qqkqkzjvr7zwxxmjxjkmxy'],
})
```

### UTXO Operations

```typescript
// Get UTXOs for addresses
const utxos = await rpc.getUtxosByAddresses({
  addresses: ['kaspa:qqkqkzjvr7zwxxmjxjkmxx'],
})

// UTXO structure
interface UtxoEntry {
  address: string
  outpoint: {
    transactionId: string
    index: number
  }
  utxoEntry: {
    amount: bigint
    scriptPublicKey: ScriptPublicKey
    blockDaaScore: bigint
    isCoinbase: boolean
  }
}
```

### Transaction Operations

```typescript
// Submit a transaction
const result = await rpc.submitTransaction({
  transaction: signedTransaction,
})

// Get mempool entries
const mempoolEntries = await rpc.getMempoolEntries({
  includeOrphanPool: false,
  filterTransactionPool: false,
})

// Get specific mempool entry
const mempoolEntry = await rpc.getMempoolEntry({
  transactionId: 'abcd1234...',
  includeOrphanPool: false,
})

// Get mempool entries by addresses
const addressMempoolEntries = await rpc.getMempoolEntriesByAddresses({
  addresses: ['kaspa:qqkqkzjvr7zwxxmjxjkmxx'],
  includeOrphanPool: false,
  filterTransactionPool: false,
})
```

### Block Operations

```typescript
// Get block by hash
const block = await rpc.getBlock({
  hash: 'abcd1234...',
  includeTransactions: true,
})

// Get blocks
const blocks = await rpc.getBlocks({
  lowHash: '0000000000000000000000000000000000000000000000000000000000000000',
  includeBlocks: true,
  includeTransactions: false,
})

// Get block DAG info
const dagInfo = await rpc.getBlockDagInfo()

// Get sink (tip)
const sink = await rpc.getSink()

// Get sink blue score
const sinkBlueScore = await rpc.getSinkBlueScore()
```

### Fee Estimation

```typescript
// Get fee estimate
const feeEstimate = await rpc.getFeeEstimate()

// Response structure
interface FeeEstimate {
  priorityBucket: {
    feeRate: bigint
    estimatedSeconds: number
  }
  normalBucket: {
    feeRate: bigint
    estimatedSeconds: number
  }
  lowBucket: {
    feeRate: bigint
    estimatedSeconds: number
  }
}
```

### Network Info

```typescript
// Get current network
const network = await rpc.getCurrentNetwork()

// Get coin supply
const coinSupply = await rpc.getCoinSupply()

// Estimate network hashrate
const hashrate = await rpc.estimateNetworkHashesPerSecond({
  windowSize: 1000,
})
```

## Transaction Building

### Complete Transaction Example

```typescript
import {
  RpcClient,
  PrivateKey,
  Transaction,
  TransactionInput,
  TransactionOutput,
  Outpoint,
  ScriptPublicKey,
  Address,
  NetworkType,
} from 'kaspa-wasm'

async function sendKaspa(
  senderPrivateKey: PrivateKey,
  recipientAddress: string,
  amount: bigint,
  rpcUrl: string,
) {
  const rpc = new RpcClient({
    url: rpcUrl,
    network: NetworkType.Mainnet,
  })

  await rpc.connect()

  try {
    // Get sender address
    const senderPublicKey = senderPrivateKey.toPublicKey()
    const senderAddress = senderPublicKey.toAddress(NetworkType.Mainnet)

    // Get UTXOs
    const utxosResponse = await rpc.getUtxosByAddresses({
      addresses: [senderAddress.toString()],
    })

    // Select UTXOs (simple selection - you may want more sophisticated logic)
    let totalInput = 0n
    const selectedUtxos = []

    for (const entry of utxosResponse.entries) {
      selectedUtxos.push(entry)
      totalInput += entry.utxoEntry.amount

      if (totalInput >= amount) {
        break
      }
    }

    if (totalInput < amount) {
      throw new Error('Insufficient funds')
    }

    // Get fee estimate
    const feeEstimate = await rpc.getFeeEstimate()
    const feeRate = feeEstimate.normalBucket.feeRate

    // Calculate fee (simplified - actual fee calculation depends on tx size)
    const estimatedSize = 200 + selectedUtxos.length * 150 + 35
    const fee = feeRate * BigInt(estimatedSize)

    // Create outputs
    const recipient = Address.fromString(recipientAddress)
    const outputs: TransactionOutput[] = [
      new TransactionOutput({
        value: amount,
        scriptPublicKey: recipient.toScriptPublicKey(),
      }),
    ]

    // Add change output if needed
    const change = totalInput - amount - fee
    if (change > 546n) {
      // Dust threshold
      outputs.push(
        new TransactionOutput({
          value: change,
          scriptPublicKey: senderAddress.toScriptPublicKey(),
        }),
      )
    }

    // Create inputs
    const inputs: TransactionInput[] = selectedUtxos.map(
      (utxo) =>
        new TransactionInput({
          previousOutpoint: new Outpoint({
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index,
          }),
          signatureScript: '',
          sequence: 0,
          sigOpCount: 1,
        }),
    )

    // Create transaction
    const transaction = new Transaction({
      version: 0,
      inputs,
      outputs,
      lockTime: 0,
      subnetworkId: '00000000000000000000000000000000',
      gas: 0,
      payload: '',
    })

    // Sign transaction
    const signedTx = transaction.sign([senderPrivateKey])

    // Submit
    const result = await rpc.submitTransaction({
      transaction: signedTx,
    })

    return result.transactionId
  } finally {
    await rpc.disconnect()
  }
}
```

## Mnemonic and HD Wallets

### Mnemonic Generation

```typescript
import { Mnemonic } from 'kaspa-wasm'

// Generate new mnemonic
const mnemonic = Mnemonic.random(24) // 12 or 24 words

// Get phrase
const phrase = mnemonic.toString()

// Validate mnemonic
const isValid = Mnemonic.validate(phrase)

// Derive seed
const seed = mnemonic.toSeed()
```

### HD Wallet (BIP32/BIP44)

```typescript
import { XPrv, XPub, DerivationPath, NetworkType } from 'kaspa-wasm'

// Create extended private key from seed
const xprv = XPrv.fromSeed(seed)

// Derive child keys
const derivationPath = "m/44'/111111'/0'/0/0" // Kaspa coin type: 111111
const childXprv = xprv.derivePath(derivationPath)

// Get private key
const privateKey = childXprv.toPrivateKey()

// Get extended public key
const xpub = xprv.toXPub()

// Derive addresses from xpub (for watch-only wallets)
const childXpub = xpub.derivePath(derivationPath)
const publicKey = childXpub.toPublicKey()
const address = publicKey.toAddress(NetworkType.Mainnet)
```

## Message Signing

### Sign Message

```typescript
import { Message } from 'kaspa-wasm'

const message = 'Hello, Kaspa!'
const signature = Message.sign(message, privateKey)
```

### Verify Message

```typescript
import { Message } from 'kaspa-wasm'

const isValid = Message.verify(message, signature, publicKey)
```

## Error Handling

```typescript
import { RpcClient, NetworkType } from 'kaspa-wasm'

const rpc = new RpcClient({
  url: 'wss://api.kaspa.org',
  network: NetworkType.Mainnet,
})

try {
  await rpc.connect()
  const balance = await rpc.getBalanceByAddress({
    address: 'kaspa:qqkqkzjvr7zwxxmjxjkmxx',
  })
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    console.error('Network connection failed')
  } else if (error.code === 'INVALID_ADDRESS') {
    console.error('Invalid address format')
  } else {
    console.error('Unknown error:', error)
  }
}
```

## TypeScript Types

```typescript
// Re-export types for convenience
export type {
  NetworkType,
  PrivateKey,
  PublicKey,
  Address,
  Transaction,
  TransactionInput,
  TransactionOutput,
  Outpoint,
  ScriptPublicKey,
  RpcClient,
  Mnemonic,
  XPrv,
  XPub,
  UtxoEntry,
  Block,
  BlockHeader,
  FeeEstimate,
  MempoolEntry,
} from 'kaspa-wasm'
```

## Browser Usage

### Via CDN

```html
<script type="module">
  import * as kaspa from 'https://unpkg.com/kaspa-wasm@latest/kaspa_wasm.js'

  const privateKey = kaspa.PrivateKey.random(kaspa.NetworkType.Mainnet)
  console.log(privateKey.toPublicKey().toAddress(kaspa.NetworkType.Mainnet).toString())
</script>
```

### Webpack/Vite Configuration

```javascript
// webpack.config.js or vite.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true,
  },
}
```

## Best Practices

1. **Always validate addresses** before using them
2. **Use proper UTXO selection** to minimize fees
3. **Handle WebSocket reconnections** for long-running applications
4. **Implement fee estimation** for timely confirmations
5. **Secure private keys** - never expose them in client-side code
6. **Test on testnet** before mainnet deployment
7. **Monitor for chain reorganizations** when confirming transactions

## Resources

- **NPM Package**: https://www.npmjs.com/package/kaspa-wasm
- **GitHub**: https://github.com/kaspanet/rusty-kaspa
- **Documentation**: https://docs.kas.fyi/
