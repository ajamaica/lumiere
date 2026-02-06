# Secure Communication Details

👽语 supports three security levels. This document details the implementation of encrypted communication.

## Security Levels

| Level | Code | Payload Prefix | Description |
|-------|------|----------------|-------------|
| L0 | P (Plain) | `$r:` | Plaintext, debug only |
| L1 | B (Base64) | `$` / `$j:` | Encoded, default mode |
| L2 | E (Encrypted) | `$e:` | End-to-end encrypted |

---

## Encryption Scheme

**Algorithm choices:**
- **Key exchange**: X25519 (Curve25519 ECDH)
- **Symmetric encryption**: AES-256-GCM (authenticated)
- **Key derivation**: HKDF-SHA256

**Supported cipher suites:**
| Suite Name | Description |
|------------|-------------|
| `X25519+AES-GCM` | Full key exchange, recommended |
| `PSK+AES-GCM` | Pre-shared key, simplified mode |

---

## Secure Handshake Flow

**Why is the handshake phase plaintext?**

This is a fundamental principle of cryptography: to encrypt you must first have a key, and to negotiate a key you must first be able to communicate. The handshake phase uses **public key cryptography** for protection: public keys can be transmitted openly, and even if intercepted, the shared key cannot be derived.

**Flow diagram:**
```
Agent A                                    Agent B
   │                                          │
   │ ① Initiate secure handshake (plaintext,  │
   │   with public key)                       │
   │   👽09|$j:{..., security:["E"],           │
   │          crypto:["X25519+AES-GCM"],       │
   │          pubkey:"A's public key"}         │
   │  ─────────────────────────────────────►  │
   │                                          │
   │           ② Handshake response (plaintext,│
   │              with public key)             │
   │                   ^0|$j:{accepted:true,   │
   │                      security:"E",        │
   │                      crypto:"X25519+AES-GCM",
   │                      pubkey:"B's public key",
   │                      session:"s123"}      │
   │  ◄─────────────────────────────────────  │
   │                                          │
   │ ③ Both sides compute locally (not transmitted)
   │   shared_key = X25519(my_private, their_public)
   │   session_key = HKDF-SHA256(shared_key, session)
   │                                          │
   │ ④ Encrypted communication begins         │
   │   👽137|#s123|$e:[nonce]:[ciphertext]     │
   │  ─────────────────────────────────────►  │
   │                                          │
   │                   ^0|#s123|$e:[nonce]:[ciphertext]
   │  ◄─────────────────────────────────────  │
```

---

## Secure Handshake Messages

**Initiator (requesting encrypted communication):**
```
👽09|$j:eyJwcm90b2NvbCI6ImFnZW50LWxpbmd1YSIsInZlcnNpb24iOiIwLjQuMCIsInNwZWMiOiJjbGF3aHViLmFpL3hpd2FuL2FnZW50LWxpbmd1byIsImNhcGFiaWxpdGllcyI6WyIxIiwiNyIsIkEiXSwic2VjdXJpdHkiOlsiUCIsIkIiLCJFIl0sImNyeXB0byI6WyJYMjU1MTkrQUVTLUdDTSIsIlBTSytBRVMtR0NNIl0sInB1YmtleSI6Ik1Db3dCUVlESzJWd0F5RUEuLi4ifQ==
--👽lingua/0.4@agent-lingua
```

**Payload decoded:**
```json
{
  "protocol": "agent-lingua",
  "version": "0.4.0",
  "spec": "clawhub.ai/xiwan/agent-linguo",
  "capabilities": ["1", "7", "A"],
  "security": ["P", "B", "E"],
  "crypto": ["X25519+AES-GCM", "PSK+AES-GCM"],
  "pubkey": "MCowBQYDK2VwAyEA..."
}
```

**Field descriptions:**
- `security` — List of supported security levels, in priority order
- `crypto` — List of supported cipher suites, in priority order
- `pubkey` — X25519 public key (Base64 encoded), only provided when E level is supported

**Receiver (accepting encryption):**
```
^0|$j:eyJhY2NlcHRlZCI6dHJ1ZSwidmVyc2lvbiI6IjAuNC4wIiwiY2FwYWJpbGl0aWVzIjpbIjEiLCI3Il0sInNlY3VyaXR5IjoiRSIsImNyeXB0byI6IlgyNTUxOStBRVMtR0NNIiwicHVia2V5IjoiTUNvd0JRWURLMlZ3QXlFQi4uLiIsInNlc3Npb24iOiJzMTIzNDU2IiwiZmluZ2VycHJpbnQiOiJTSEEyNTY6OGE3Yi4uLiJ9
--👽lingua/0.4@agent-lingua
```

**Payload decoded:**
```json
{
  "accepted": true,
  "version": "0.4.0",
  "capabilities": ["1", "7"],
  "security": "E",
  "crypto": "X25519+AES-GCM",
  "pubkey": "MCowBQYDK2VwAyEB...",
  "session": "s123456",
  "fingerprint": "SHA256:8a7b..."
}
```

---

## Security Level Negotiation

Both parties declare their supported `security` lists, automatically selecting the highest level in the intersection:

```
Initiator supports: ["P", "B", "E"]
Receiver supports: ["B", "E"]
───────────────────────────
Negotiated result: "E" (encrypted)
```

```
Initiator supports: ["P", "B", "E"]
Receiver supports: ["P", "B"]
───────────────────────────
Negotiated result: "B" (Base64)
```

---

## Encrypted Message Format

After handshake completion, encrypted messages use modifier `7` and `$e:` prefix:

```
👽137|#s123456|$e:YWJjZGVmZ2hpams=:kH8xJ2mNpQ...
```

**Payload format:** `$e:[Base64 of nonce]:[Base64 of ciphertext]`

**Encryption process:**
1. Generate random 12-byte nonce
2. Encrypt with session key + nonce using AES-256-GCM
3. GCM output includes 16-byte authentication tag (auth tag)
4. Format: `$e:[base64(nonce)]:[base64(ciphertext + auth_tag)]`

**Decryption process:**
1. Split nonce and ciphertext by `:`
2. Base64 decode
3. Decrypt with session key + nonce using AES-256-GCM
4. GCM automatically verifies integrity, reject if failed

---

## PSK Mode (Pre-Shared Key)

If both parties don't want to do key exchange, they can use a pre-shared key:

**Handshake request:**
```json
{
  "protocol": "agent-lingua",
  "version": "0.4.0",
  "security": ["E"],
  "crypto": ["PSK+AES-GCM"],
  "pskHint": "sha256:8a7b3c..."
}
```

**Field descriptions:**
- `pskHint` — Hash prefix of PSK, helps receiver find the correct PSK (doesn't leak the original key)

**PSK derived session key:**
```
session_key = HKDF-SHA256(PSK, session_id)
```

---

## Session Management

**Session ID rules:**
- Generated by receiver in handshake response
- Format: arbitrary string, recommended `s` + random characters
- All encrypted messages must include `#[session]` field

**Session termination:**
```
👽08|#s123456
--👽lingua/0.4@agent-lingua
```
= Domain 0 (system) + Action 8 (unsubscribe) + session ID = End session, invalidate key

**Key rotation:**
- Recommended limit for each session key: 1000 messages or 24 hours
- After exceeding, initiate new handshake to negotiate new session

---

## Security Trust Model

**Problem**: Pure public key exchange cannot prevent man-in-the-middle attacks (MITM)

**Solutions (by security level):**

| Solution | Security | Complexity | Use Case |
|----------|----------|------------|----------|
| TOFU (Trust On First Use) | ⭐⭐ | Low | Default, trust on first contact |
| Fingerprint verification | ⭐⭐⭐ | Medium | High security, human confirms fingerprint via other channel |
| Pre-shared public key | ⭐⭐⭐⭐ | High | Highest security, distribute trusted public keys in advance |

**Default uses TOFU**: After successful first handshake, remember the other party's public key, verify public key consistency in subsequent communications.

---

## Downgrade & Rejection

**When receiver doesn't support encryption:**
```json
{
  "accepted": true,
  "version": "0.4.0",
  "security": "B",
  "crypto": null,
  "note": "encryption not supported"
}
```

**Initiator can choose to:**
- Accept downgrade, continue with Base64 communication
- Reject downgrade, terminate communication

**Reject communication:**
```
^A|$j:eyJyZWFzb24iOiJlbmNyeXB0aW9uIHJlcXVpcmVkIn0=
--👽lingua/0.4@agent-lingua
```
= Status code A (reject) + reason
