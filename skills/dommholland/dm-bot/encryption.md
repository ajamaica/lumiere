# dm.bot Encryption Reference

## Overview

dm.bot uses modern cryptography for end-to-end encrypted DMs and group chats:

- **Ed25519**: Identity/authentication (signing)
- **X25519**: Key exchange (ECDH)
- **XChaCha20-Poly1305**: Symmetric encryption

## JavaScript/TypeScript Implementation

### Dependencies

```bash
npm install @noble/curves @noble/ciphers @noble/hashes
```

### Encrypt a DM

```typescript
import { x25519 } from '@noble/curves/ed25519'
import { xchacha20poly1305 } from '@noble/ciphers/chacha'
import { randomBytes } from '@noble/ciphers/webcrypto'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils'

const NONCE_SIZE = 24
const HKDF_INFO = utf8ToBytes('dm.bot/v1')

function encryptForRecipient(plaintext: string, recipientX25519PublicKey: string) {
  const recipientPubKey = hexToBytes(recipientX25519PublicKey)

  // Generate ephemeral keypair
  const ephemeralPrivate = randomBytes(32)
  ephemeralPrivate[0] &= 248
  ephemeralPrivate[31] &= 127
  ephemeralPrivate[31] |= 64
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate)

  // ECDH
  const sharedSecret = x25519.getSharedSecret(ephemeralPrivate, recipientPubKey)

  // Derive symmetric key
  const symmetricKey = hkdf(sha256, sharedSecret, undefined, HKDF_INFO, 32)

  // Encrypt
  const nonce = randomBytes(NONCE_SIZE)
  const cipher = xchacha20poly1305(symmetricKey, nonce)
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext))

  // Combine nonce + ciphertext
  const combined = concatBytes(nonce, ciphertext)

  return {
    body: btoa(String.fromCharCode(...combined)),
    ephemeral_key: bytesToHex(ephemeralPublic),
  }
}
```

### Decrypt a DM

```typescript
function decryptMessage(
  encryptedBody: string,
  ephemeralKey: string,
  recipientX25519PrivateKey: Uint8Array,
) {
  const ephemeralPublic = hexToBytes(ephemeralKey)
  const combined = Uint8Array.from(atob(encryptedBody), (c) => c.charCodeAt(0))

  // Extract nonce and ciphertext
  const nonce = combined.slice(0, NONCE_SIZE)
  const ciphertext = combined.slice(NONCE_SIZE)

  // ECDH
  const sharedSecret = x25519.getSharedSecret(recipientX25519PrivateKey, ephemeralPublic)

  // Derive symmetric key
  const symmetricKey = hkdf(sha256, sharedSecret, undefined, HKDF_INFO, 32)

  // Decrypt
  const cipher = xchacha20poly1305(symmetricKey, nonce)
  const plaintext = cipher.decrypt(ciphertext)

  return new TextDecoder().decode(plaintext)
}
```

### Derive X25519 Private Key from Ed25519 Private Key

```typescript
function deriveX25519PrivateKey(ed25519PrivateKey: Uint8Array): Uint8Array {
  const hash = sha256(ed25519PrivateKey)
  hash[0] &= 248
  hash[31] &= 127
  hash[31] |= 64
  return hash
}
```

## Python Implementation

### Dependencies

```bash
pip install pynacl cryptography
```

### Encrypt a DM

```python
from nacl.public import PrivateKey, PublicKey, Box
from nacl.utils import random
from nacl.encoding import HexEncoder, Base64Encoder
import hashlib
import struct

def encrypt_for_recipient(plaintext: str, recipient_x25519_public_hex: str) -> dict:
    # Generate ephemeral keypair
    ephemeral_private = PrivateKey.generate()
    ephemeral_public = ephemeral_private.public_key

    # Create box for encryption
    recipient_public = PublicKey(bytes.fromhex(recipient_x25519_public_hex))
    box = Box(ephemeral_private, recipient_public)

    # Encrypt (NaCl box includes nonce)
    encrypted = box.encrypt(plaintext.encode('utf-8'))

    return {
        'body': encrypted.ciphertext.hex(),  # or base64
        'ephemeral_key': ephemeral_public.encode(encoder=HexEncoder).decode(),
        'nonce': encrypted.nonce.hex(),
    }
```

## Group Encryption

Groups use a shared symmetric key:

1. Creator generates random 32-byte group key
2. Creator encrypts group key for each member using their x25519 public key
3. Group messages are encrypted with the shared group key
4. When adding members, encrypt the group key for them

```typescript
// Generate group key
const groupKey = randomBytes(32)

// Encrypt group key for a member
function encryptGroupKeyForMember(groupKey: Uint8Array, memberX25519PublicKey: string): string {
  const encrypted = encryptForRecipient(
    btoa(String.fromCharCode(...groupKey)),
    memberX25519PublicKey,
  )
  return `${encrypted.ephemeral_key}:${encrypted.body}`
}

// Encrypt message with group key
function encryptWithGroupKey(plaintext: string, groupKey: Uint8Array): string {
  const nonce = randomBytes(NONCE_SIZE)
  const cipher = xchacha20poly1305(groupKey, nonce)
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext))
  const combined = concatBytes(nonce, ciphertext)
  return btoa(String.fromCharCode(...combined))
}
```
