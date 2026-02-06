# CIFER SDK - Quantum-Resistant Blockchain Encryption

> **Skill for AI Agents** | Enable quantum-resistant encryption in blockchain applications using the CIFER SDK.

## Overview

CIFER (Cryptographic Infrastructure for Encrypted Records) SDK provides quantum-resistant encryption for blockchain applications. This skill enables AI agents to implement secure data encryption, secret management, and on-chain commitments using post-quantum cryptography.

### Key Capabilities

- **Quantum-Resistant Encryption**: ML-KEM-768 (NIST standardized) key encapsulation
- **Multi-Chain Support**: Automatic chain discovery and configuration
- **Wallet Agnostic**: Works with MetaMask, WalletConnect, Coinbase, Thirdweb, and custom signers
- **File Encryption**: Async job system for large file encryption/decryption
- **On-Chain Commitments**: Store encrypted data references on-chain with log-based retrieval
- **Transaction Intents**: Non-custodial pattern - you control transaction execution

## When to Use This Skill

Use the CIFER SDK when you need to:

- Encrypt sensitive data with quantum-resistant algorithms
- Store encrypted records on blockchain
- Manage encryption keys with owner/delegate authorization
- Encrypt files larger than 16KB using the job system
- Build applications requiring post-quantum security

## Installation

```bash
npm install cifer-sdk
# or
yarn add cifer-sdk
# or
pnpm add cifer-sdk
```

**Requirements**: Node.js 18.0+, TypeScript 5.0+ (recommended)

## Quick Start

```typescript
import { createCiferSdk, Eip1193SignerAdapter, blackbox } from 'cifer-sdk'

// 1. Initialize SDK with auto-discovery
const sdk = await createCiferSdk({
  blackboxUrl: 'https://blackbox.cifer.network',
})

// 2. Connect wallet (browser)
const signer = new Eip1193SignerAdapter(window.ethereum)

// 3. Encrypt data
const encrypted = await blackbox.payload.encryptPayload({
  chainId: 752025,
  secretId: 123n,
  plaintext: 'My secret message',
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
})

// 4. Decrypt data
const decrypted = await blackbox.payload.decryptPayload({
  chainId: 752025,
  secretId: 123n,
  encryptedMessage: encrypted.encryptedMessage,
  cifer: encrypted.cifer,
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
})

console.log(decrypted.decryptedMessage) // 'My secret message'
```

---

## Core Concepts

### Secrets

A **secret** is the core primitive in CIFER. Each secret represents an ML-KEM-768 key pair:

| Property       | Description                                          |
| -------------- | ---------------------------------------------------- |
| `owner`        | Address that can transfer, set delegate, and decrypt |
| `delegate`     | Address that can decrypt only (zero address if none) |
| `isSyncing`    | `true` while key generation is in progress           |
| `clusterId`    | Which enclave cluster holds the private key shards   |
| `secretType`   | `1` = ML-KEM-768 (standard)                          |
| `publicKeyCid` | IPFS CID of public key (empty if syncing)            |

**Lifecycle**: Creation → Syncing (~30-60s) → Ready

### Authorization Model

| Role         | Capabilities                             |
| ------------ | ---------------------------------------- |
| **Owner**    | Encrypt, decrypt, transfer, set delegate |
| **Delegate** | Decrypt only                             |

### Encryption Model

CIFER uses hybrid encryption:

1. **ML-KEM-768**: Post-quantum key encapsulation (1088-byte ciphertext)
2. **AES-256-GCM**: Symmetric encryption for actual data

Output format:

- `cifer`: 1104 bytes (ML-KEM ciphertext + tag)
- `encryptedMessage`: Variable length (max 16KB)

### Transaction Intents

The SDK returns transaction intents instead of executing transactions:

```typescript
interface TxIntent {
  chainId: number
  to: Address
  data: Hex
  value?: bigint
}
```

Execute with any wallet library (ethers, wagmi, viem).

---

## API Reference

### SDK Initialization

#### With Discovery (Recommended)

```typescript
const sdk = await createCiferSdk({
  blackboxUrl: 'https://blackbox.cifer.network',
})

sdk.getSupportedChainIds() // [752025, 11155111, ...]
sdk.getControllerAddress(752025) // '0x...'
sdk.getRpcUrl(752025) // 'https://...'
```

#### With Overrides

```typescript
const sdk = await createCiferSdk({
  blackboxUrl: 'https://blackbox.cifer.network',
  chainOverrides: {
    752025: {
      rpcUrl: 'https://my-private-rpc.example.com',
      secretsControllerAddress: '0x...',
    },
  },
})
```

#### Synchronous (No Discovery)

```typescript
import { createCiferSdkSync, RpcReadClient } from 'cifer-sdk'

const readClient = new RpcReadClient({
  rpcUrlByChainId: {
    752025: 'https://mainnet.ternoa.network',
  },
})

const sdk = createCiferSdkSync({
  blackboxUrl: 'https://blackbox.cifer.network',
  readClient,
  chainOverrides: {
    752025: {
      rpcUrl: 'https://mainnet.ternoa.network',
      secretsControllerAddress: '0x...',
    },
  },
})
```

---

### Wallet Integration

All wallets must implement the `SignerAdapter` interface:

```typescript
interface SignerAdapter {
  getAddress(): Promise<string>
  signMessage(message: string): Promise<string>
  sendTransaction?(txRequest: TxIntent): Promise<TxExecutionResult>
}
```

#### MetaMask

```typescript
import { Eip1193SignerAdapter } from 'cifer-sdk'

await window.ethereum.request({ method: 'eth_requestAccounts' })
const signer = new Eip1193SignerAdapter(window.ethereum)
```

#### WalletConnect v2

```typescript
import { EthereumProvider } from '@walletconnect/ethereum-provider'

const provider = await EthereumProvider.init({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [752025],
  showQrModal: true,
})

await provider.connect()
const signer = new Eip1193SignerAdapter(provider)
```

#### Private Key (Server-Side)

```typescript
import { Wallet } from 'ethers'

const wallet = new Wallet(process.env.PRIVATE_KEY)

const signer = {
  async getAddress() {
    return wallet.address
  },
  async signMessage(message) {
    return wallet.signMessage(message)
  },
}
```

#### wagmi (React)

```typescript
import { useAccount, useConnectorClient } from 'wagmi'

function useCiferSigner() {
  const { address, isConnected } = useAccount()
  const { data: connectorClient } = useConnectorClient()

  const getSigner = async () => {
    if (!isConnected || !connectorClient) {
      throw new Error('Wallet not connected')
    }
    const provider = await connectorClient.transport
    return new Eip1193SignerAdapter(provider)
  }

  return { getSigner, address, isConnected }
}
```

---

### keyManagement Namespace

Interact with the SecretsController contract for secret management.

#### Read Operations

```typescript
// Get secret creation fee
const fee = await keyManagement.getSecretCreationFee({
  chainId: 752025,
  controllerAddress: sdk.getControllerAddress(752025),
  readClient: sdk.readClient,
})

// Get secret state
const state = await keyManagement.getSecret(params, 123n)
// Returns: { owner, delegate, isSyncing, clusterId, secretType, publicKeyCid }

// Check if secret is ready
const ready = await keyManagement.isSecretReady(params, 123n)

// Check authorization
const canDecrypt = await keyManagement.isAuthorized(params, 123n, '0x...')

// Get secrets by wallet
const secrets = await keyManagement.getSecretsByWallet(params, '0xUser...')
// Returns: { owned: bigint[], delegated: bigint[] }
```

#### Transaction Builders

```typescript
// Create a new secret
const fee = await keyManagement.getSecretCreationFee(params);
const txIntent = keyManagement.buildCreateSecretTx({
  chainId: 752025,
  controllerAddress: sdk.getControllerAddress(752025),
  fee,
});

// Set delegate
const txIntent = keyManagement.buildSetDelegateTx({
  chainId: 752025,
  controllerAddress: sdk.getControllerAddress(752025),
  secretId: 123n,
  newDelegate: '0xDelegate...',
});

// Remove delegate
const txIntent = keyManagement.buildRemoveDelegationTx({ ... });

// Transfer ownership (irreversible!)
const txIntent = keyManagement.buildTransferSecretTx({
  chainId: 752025,
  controllerAddress: sdk.getControllerAddress(752025),
  secretId: 123n,
  newOwner: '0xNewOwner...',
});
```

#### Event Parsing

```typescript
const receipt = await provider.waitForTransaction(hash)
const secretId = keyManagement.extractSecretIdFromReceipt(receipt.logs)
```

---

### blackbox.payload Namespace

Encrypt and decrypt short messages (< 16KB).

#### Encrypt

```typescript
const encrypted = await blackbox.payload.encryptPayload({
  chainId: 752025,
  secretId: 123n,
  plaintext: 'My secret message',
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
  outputFormat: 'hex', // or 'base64'
})

// Returns: { cifer: string, encryptedMessage: string }
```

#### Decrypt

```typescript
const decrypted = await blackbox.payload.decryptPayload({
  chainId: 752025,
  secretId: 123n,
  encryptedMessage: encrypted.encryptedMessage,
  cifer: encrypted.cifer,
  signer, // Must be owner or delegate
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
  inputFormat: 'hex',
})

// Returns: { decryptedMessage: string }
```

---

### blackbox.files Namespace

Encrypt and decrypt large files using async jobs.

```typescript
// Start encryption job
const job = await blackbox.files.encryptFile({
  chainId: 752025,
  secretId: 123n,
  file: myFile,
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
});
// Returns: { jobId: string, message: string }

// Start decryption job
const job = await blackbox.files.decryptFile({ ... });

// Decrypt from existing encrypt job
const job = await blackbox.files.decryptExistingFile({
  chainId: 752025,
  secretId: 123n,
  encryptJobId: previousJobId,
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
});
```

---

### blackbox.jobs Namespace

Manage async file jobs.

```typescript
// Get job status
const status = await blackbox.jobs.getStatus(jobId, sdk.blackboxUrl);
// Returns: { id, type, status, progress, secretId, chainId, ... }

// Poll until complete
const finalStatus = await blackbox.jobs.pollUntilComplete(
  jobId,
  sdk.blackboxUrl,
  {
    intervalMs: 2000,
    maxAttempts: 120,
    onProgress: (job) => console.log(`Progress: ${job.progress}%`),
  }
);

// Download result (encrypt jobs: no auth, decrypt jobs: auth required)
const blob = await blackbox.jobs.download(jobId, {
  blackboxUrl: sdk.blackboxUrl,
  // For decrypt jobs, also provide:
  chainId: 752025,
  secretId: 123n,
  signer,
  readClient: sdk.readClient,
});

// List jobs for wallet
const result = await blackbox.jobs.list({
  chainId: 752025,
  signer,
  readClient: sdk.readClient,
  blackboxUrl: sdk.blackboxUrl,
});

// Get data consumption stats
const stats = await blackbox.jobs.dataConsumption({ ... });
```

---

### commitments Namespace

Store and retrieve encrypted data on-chain.

```typescript
// Check if commitment exists
const exists = await commitments.ciferDataExists(params, dataId)

// Get metadata
const metadata = await commitments.getCIFERMetadata(params, dataId)
// Returns: { secretId, storedAtBlock, ciferHash, encryptedMessageHash }

// Fetch encrypted data from logs
const data = await commitments.fetchCommitmentFromLogs({
  chainId: 752025,
  contractAddress: '0x...',
  dataId: dataKey,
  storedAtBlock: metadata.storedAtBlock,
  readClient: sdk.readClient,
})
// Returns: { cifer, encryptedMessage, ciferHash, encryptedMessageHash }

// Verify integrity
const result = commitments.verifyCommitmentIntegrity(data, metadata)

// Build store transaction
const txIntent = commitments.buildStoreCommitmentTx({
  chainId: 752025,
  contractAddress: '0xYourContract...',
  storeFunction: {
    type: 'function',
    name: 'store',
    inputs: [
      { name: 'key', type: 'bytes32' },
      { name: 'encryptedMessage', type: 'bytes' },
      { name: 'cifer', type: 'bytes' },
    ],
  },
  args: {
    key: dataKey,
    secretId: 123n,
    encryptedMessage: encrypted.encryptedMessage,
    cifer: encrypted.cifer,
  },
})
```

**Constants**:

- `CIFER_ENVELOPE_BYTES = 1104` (fixed cifer size)
- `MAX_PAYLOAD_BYTES = 16384` (16KB max payload)

---

### flows Namespace

High-level orchestrated operations.

#### Flow Context

```typescript
const ctx = {
  signer: SignerAdapter,
  readClient: ReadClient,
  blackboxUrl: string,
  chainId: number,
  controllerAddress?: Address,
  txExecutor?: (intent: TxIntent) => Promise<TxExecutionResult>,
  pollingStrategy?: { intervalMs: number, maxAttempts: number },
  logger?: (message: string) => void,
  abortSignal?: AbortSignal,
};
```

#### Create Secret and Wait

```typescript
const result = await flows.createSecretAndWaitReady({
  ...ctx,
  controllerAddress: sdk.getControllerAddress(752025),
  txExecutor: async (intent) => {
    const hash = await wallet.sendTransaction(intent)
    return { hash, waitReceipt: () => provider.waitForTransaction(hash) }
  },
})

if (result.success) {
  console.log('Secret ID:', result.data.secretId)
  console.log('Public Key CID:', result.data.state.publicKeyCid)
}
```

#### Encrypt and Prepare Commit

```typescript
const result = await flows.encryptThenPrepareCommitTx(ctx, {
  secretId: 123n,
  plaintext: 'My secret data',
  key: dataKey,
  commitmentContract: '0x...',
})

if (result.success) {
  await wallet.sendTransaction(result.data.txIntent)
}
```

#### Retrieve and Decrypt from Logs

```typescript
const result = await flows.retrieveFromLogsThenDecrypt(ctx, {
  secretId: 123n,
  dataId: dataKey,
  commitmentContract: '0x...',
})

if (result.success) {
  console.log('Decrypted:', result.data.decryptedMessage)
}
```

#### File Flows

```typescript
// Encrypt file flow
const result = await flows.encryptFileJobFlow(ctx, {
  secretId: 123n,
  file: myFile,
})
// Returns: { jobId, job, encryptedFile: Blob }

// Decrypt file flow
const result = await flows.decryptFileJobFlow(ctx, {
  secretId: 123n,
  file: ciferFile,
})
// Returns: { jobId, job, decryptedFile: Blob }
```

---

## Error Handling

All SDK errors extend `CiferError` with typed subclasses:

```
CiferError
├── ConfigError
│   ├── DiscoveryError
│   └── ChainNotSupportedError
├── AuthError
│   ├── SignatureError
│   ├── BlockStaleError
│   └── SignerMismatchError
├── BlackboxError
│   ├── EncryptionError
│   ├── DecryptionError
│   ├── JobError
│   └── SecretNotReadyError
├── KeyManagementError
│   ├── SecretNotFoundError
│   └── NotAuthorizedError
├── CommitmentsError
│   ├── CommitmentNotFoundError
│   ├── IntegrityError
│   ├── InvalidCiferSizeError
│   └── PayloadTooLargeError
└── FlowError
    ├── FlowAbortedError
    └── FlowTimeoutError
```

### Type Guards

```typescript
import { isCiferError, isBlockStaleError, isSecretNotReadyError } from 'cifer-sdk'
```

### Error Handling Example

```typescript
try {
  await blackbox.payload.encryptPayload({ ... });
} catch (error) {
  if (isBlockStaleError(error)) {
    console.log('RPC returning stale blocks');
  } else if (error instanceof SecretNotReadyError) {
    console.log('Wait for secret to sync');
  } else if (error instanceof SecretNotFoundError) {
    console.log('Secret not found:', error.secretId);
  } else if (isCiferError(error)) {
    console.log('CIFER error:', error.code, error.message);
  } else {
    throw error;
  }
}
```

### Common Scenarios

| Error                           | Cause                      | Solution                                   |
| ------------------------------- | -------------------------- | ------------------------------------------ |
| "Block number is too old"       | RPC issues                 | SDK auto-retries 3x; check RPC reliability |
| "Secret is syncing"             | Key generation in progress | Wait 30-60s; use `isSecretReady()`         |
| "Signature verification failed" | Wrong signing method       | Use EIP-191 `personal_sign`                |
| "Not authorized"                | Not owner/delegate         | Check with `isAuthorized()`                |

---

## Complete Examples

### Browser: Encrypt/Decrypt Message

```typescript
import { createCiferSdk, Eip1193SignerAdapter, blackbox } from 'cifer-sdk'

async function encryptDecryptExample() {
  const sdk = await createCiferSdk({
    blackboxUrl: 'https://blackbox.cifer.network',
  })
  const signer = new Eip1193SignerAdapter(window.ethereum)

  const chainId = 752025
  const secretId = 123n

  // Encrypt
  const encrypted = await blackbox.payload.encryptPayload({
    chainId,
    secretId,
    plaintext: 'Hello, CIFER!',
    signer,
    readClient: sdk.readClient,
    blackboxUrl: sdk.blackboxUrl,
  })

  // Decrypt
  const decrypted = await blackbox.payload.decryptPayload({
    chainId,
    secretId,
    encryptedMessage: encrypted.encryptedMessage,
    cifer: encrypted.cifer,
    signer,
    readClient: sdk.readClient,
    blackboxUrl: sdk.blackboxUrl,
  })

  console.log('Decrypted:', decrypted.decryptedMessage)
}
```

### Node.js Server-Side

```typescript
import { createCiferSdk, RpcReadClient, blackbox } from 'cifer-sdk'
import { Wallet } from 'ethers'

async function serverSideExample() {
  const readClient = new RpcReadClient({
    rpcUrlByChainId: {
      752025: 'https://mainnet.ternoa.network',
    },
  })

  const sdk = await createCiferSdk({
    blackboxUrl: 'https://blackbox.cifer.network',
    readClient,
  })

  const wallet = new Wallet(process.env.PRIVATE_KEY)
  const signer = {
    async getAddress() {
      return wallet.address
    },
    async signMessage(message) {
      return wallet.signMessage(message)
    },
  }

  const encrypted = await blackbox.payload.encryptPayload({
    chainId: 752025,
    secretId: 123n,
    plaintext: 'Server-side encryption',
    signer,
    readClient: sdk.readClient,
    blackboxUrl: sdk.blackboxUrl,
  })

  console.log('Encrypted on server:', encrypted)
}
```

### File Encryption with Progress

```typescript
import { createCiferSdk, Eip1193SignerAdapter, blackbox } from 'cifer-sdk'

async function fileEncryptionExample() {
  const sdk = await createCiferSdk({
    blackboxUrl: 'https://blackbox.cifer.network',
  })
  const signer = new Eip1193SignerAdapter(window.ethereum)

  const file = document.getElementById('fileInput').files[0]

  // Start job
  const job = await blackbox.files.encryptFile({
    chainId: 752025,
    secretId: 123n,
    file,
    signer,
    readClient: sdk.readClient,
    blackboxUrl: sdk.blackboxUrl,
  })

  // Poll with progress
  const finalStatus = await blackbox.jobs.pollUntilComplete(job.jobId, sdk.blackboxUrl, {
    onProgress: (status) => console.log(`Progress: ${status.progress}%`),
  })

  if (finalStatus.status === 'completed') {
    const encryptedBlob = await blackbox.jobs.download(job.jobId, {
      blackboxUrl: sdk.blackboxUrl,
    })

    // Download file
    const url = URL.createObjectURL(encryptedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'encrypted.cifer'
    a.click()
  }
}
```

---

## Type Definitions

```typescript
type Address = `0x${string}`
type Bytes32 = `0x${string}`
type Hex = `0x${string}`
type ChainId = number
type SecretId = bigint
type OutputFormat = 'hex' | 'base64'
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
type JobType = 'encrypt' | 'decrypt'

interface SecretState {
  owner: Address
  delegate: Address
  isSyncing: boolean
  clusterId: number
  secretType: number
  publicKeyCid: string
}

interface JobInfo {
  id: string
  type: JobType
  status: JobStatus
  progress: number
  secretId: number
  chainId: ChainId
  createdAt: number
  completedAt?: number
  error?: string
  resultFileName?: string
  ttl: number
  originalSize?: number
}

interface FlowResult<T> {
  success: boolean
  plan: FlowPlan
  data?: T
  error?: Error
  receipts?: TransactionReceipt[]
}
```

---

## Resources

- **npm**: [https://www.npmjs.com/package/cifer-sdk](https://www.npmjs.com/package/cifer-sdk)
- **GitHub**: [https://github.com/cifer-security/cifer-sdk](https://github.com/cifer-security/cifer-sdk)
- **Blackbox API**: `https://blackbox.cifer.network`
- **Supported Chain**: Ternoa (752025)

---

_This skill enables AI agents to implement quantum-resistant encryption in blockchain applications using the CIFER SDK._
