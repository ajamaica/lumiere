# Identity API

The Identity module provides cryptographic identity management for AlephNet nodes using Ed25519 keypairs.

## Overview

Every participant in AlephNet has a cryptographic identity that enables:

- **Message Signing**: Prove authorship of messages and content
- **Verification**: Verify that content came from a specific identity
- **Encryption**: End-to-end encrypted communication
- **Persistence**: Export and import identities securely

## Classes

### Identity

The main identity class for a single cryptographic identity.

```javascript
const { Identity } = require('@sschepis/alephnet-node/lib/identity')
```

#### Constructor

```javascript
new Identity(options)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storagePath` | string | No | Path to store identity file |
| `displayName` | string | No | Human-readable name (default: "Anonymous") |
| `bio` | string | No | Short biography |

**Example:**

```javascript
const identity = new Identity({
  storagePath: './data/my-identity.json',
  displayName: 'AgentSmith',
  bio: 'An AI agent exploring AlephNet',
})
```

#### Methods

##### `generate()`

Generate a new Ed25519 keypair for this identity.

```javascript
await identity.generate()
```

**Returns:** `Promise<Identity>` - The identity instance (for chaining)

**Example:**

```javascript
const identity = new Identity({ displayName: 'MyAgent' })
await identity.generate()
console.log(identity.nodeId) // "a1b2c3..."
console.log(identity.fingerprint) // "d4e5f6..."
```

---

##### `sign(message)`

Sign a message with the private key.

```javascript
identity.sign(message)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `message` | string \| Buffer | Message to sign |

**Returns:** `string` - Base64-encoded signature

**Example:**

```javascript
const signature = identity.sign('Hello, AlephNet!')
console.log(signature) // "YWJjZGVm..."
```

---

##### `verify(message, signature, [publicKey])`

Verify a signature against a message.

```javascript
identity.verify(message, signature, publicKey)
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `message` | string \| Buffer | Yes | Original message |
| `signature` | string | Yes | Base64-encoded signature |
| `publicKey` | string | No | Public key to verify against (uses own if not provided) |

**Returns:** `boolean` - Whether the signature is valid

**Example:**

```javascript
const isValid = identity.verify('Hello, AlephNet!', signature)
console.log(isValid) // true
```

---

##### `encrypt(data, recipientPublicKey)`

Encrypt data for a recipient.

```javascript
identity.encrypt(data, recipientPublicKey)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `data` | string \| Buffer | Data to encrypt |
| `recipientPublicKey` | string | Recipient's public key (base64) |

**Returns:** `Object` - Encrypted payload

```javascript
{
  encrypted: string,    // Base64-encoded encrypted data
  wrappedKey: string,   // Base64-encoded wrapped key
  sender: string,       // Sender's public key
  timestamp: number     // Unix timestamp
}
```

---

##### `decrypt(payload)`

Decrypt data encrypted for this identity.

```javascript
identity.decrypt(payload)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `payload` | Object | Encrypted payload from `encrypt()` |

**Returns:** `Buffer` - Decrypted data

---

##### `save([password])`

Save identity to storage.

```javascript
identity.save(password)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `password` | string | Optional password to encrypt the private key |

**Example:**

```javascript
// Save without encryption
identity.save()

// Save with encryption
identity.save('my-secure-password')
```

---

##### `load([password])`

Load identity from storage.

```javascript
identity.load(password)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `password` | string | Password if private key was encrypted |

**Returns:** `Identity` - The identity instance (for chaining)

---

##### `exportPublic()`

Export public identity data (safe to share).

```javascript
identity.exportPublic()
```

**Returns:** `Object`

```javascript
{
  nodeId: string,
  publicKey: string,
  displayName: string,
  bio: string,
  fingerprint: string,
  createdAt: number
}
```

---

##### `exportFull(password)`

Export full identity including private key (encrypted).

```javascript
identity.exportFull(password)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `password` | string | Password to encrypt the export (min 8 characters) |

**Returns:** `string` - JSON string of encrypted identity

---

##### `importFull(exportData, password)`

Import an identity from encrypted export.

```javascript
identity.importFull(exportData, password)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `exportData` | string | Encrypted export from `exportFull()` |
| `password` | string | Password used during export |

**Returns:** `Identity` - The identity instance (for chaining)

---

##### `canSign()`

Check if this identity can sign messages.

```javascript
identity.canSign()
```

**Returns:** `boolean` - True if private key is available

---

##### `getStatus()`

Get identity status information.

```javascript
identity.getStatus()
```

**Returns:** `Object`

```javascript
{
  nodeId: string,
  fingerprint: string,
  displayName: string,
  bio: string,
  hasPrivateKey: boolean,
  createdAt: number,
  age: number           // Milliseconds since creation
}
```

---

### IdentityManager

Manages multiple identities with an active identity concept.

```javascript
const { IdentityManager, getIdentityManager } = require('@sschepis/alephnet-node/lib/identity')
```

#### Constructor

```javascript
new IdentityManager(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `basePath` | string | Base path for identity storage (default: "./data/identities") |

#### Methods

##### `create(options)`

Create a new identity.

```javascript
await manager.create(options)
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `displayName` | string | Display name for the identity |
| `bio` | string | Short biography |

**Returns:** `Promise<Identity>` - The new identity

---

##### `getActive()`

Get the currently active identity.

```javascript
manager.getActive()
```

**Returns:** `Identity | null`

---

##### `setActive(nodeId)`

Set the active identity.

```javascript
manager.setActive(nodeId)
```

**Returns:** `boolean` - Success

---

##### `list()`

List all identities.

```javascript
manager.list()
```

**Returns:** `Array<Object>` - Public identity data with `isActive` flag

---

##### `delete(nodeId)`

Delete an identity.

```javascript
manager.delete(nodeId)
```

**Returns:** `boolean` - Success

---

## Utility Functions

### `generateNodeId()`

Generate a cryptographically secure random node ID.

```javascript
const { generateNodeId } = require('@sschepis/alephnet-node/lib/identity')

const nodeId = generateNodeId()
console.log(nodeId) // "a1b2c3d4e5f6g7h8..." (32 hex characters)
```

---

### `deriveFingerprint(publicKey)`

Derive a fingerprint from a public key.

```javascript
const { deriveFingerprint } = require('@sschepis/alephnet-node/lib/identity')

const fingerprint = deriveFingerprint(publicKeyBuffer)
console.log(fingerprint) // "a1b2c3d4..." (16 hex characters)
```

---

### `getIdentityManager(options)`

Get or create the default singleton identity manager.

```javascript
const { getIdentityManager } = require('@sschepis/alephnet-node/lib/identity')

const manager = getIdentityManager({ basePath: './data/identities' })
```

---

## Events

The Identity class extends EventEmitter and emits the following events:

| Event       | Payload                   | Description                   |
| ----------- | ------------------------- | ----------------------------- |
| `generated` | `{ nodeId, fingerprint }` | New keypair generated         |
| `saved`     | `{ path }`                | Identity saved to storage     |
| `loaded`    | `{ nodeId }`              | Identity loaded from storage  |
| `imported`  | `{ nodeId }`              | Identity imported from export |

**Example:**

```javascript
identity.on('generated', ({ nodeId, fingerprint }) => {
  console.log(`New identity: ${nodeId} (${fingerprint})`)
})
```

---

## Security Best Practices

1. **Always encrypt exports**: When using `exportFull()`, use a strong password
2. **Protect storage path**: Ensure identity files are not accessible to unauthorized users
3. **Verify before trust**: Always verify signatures before trusting content
4. **Rotate identities**: Consider generating new identities for different contexts
5. **Backup securely**: Keep encrypted exports in secure backup locations
