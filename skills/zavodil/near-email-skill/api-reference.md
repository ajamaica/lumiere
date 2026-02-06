# NEAR Email API Reference

Complete API reference for NEAR Email integration.

## Endpoints

Two ways to access NEAR Email:

| Method | Endpoint | Payment |
|--------|----------|---------|
| **HTTPS API** | `POST api.outlayer.fastnear.com/call/...` | Payment Key (pre-paid) |
| **NEAR Transaction** | `outlayer.near::request_execution` | Deposit (unused refunded) |

**Note:** NEAR Email supports mainnet only.

---

### Option A: HTTPS API (Payment Key)

```
POST https://api.outlayer.fastnear.com/call/{contract}/{project}
```

| Contract | Project ID |
|----------|------------|
| `outlayer.near` | `zavodil.near/near-email` |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `X-Payment-Key` | Yes | Payment key from OutLayer Dashboard |

---

### Option B: NEAR Transaction (Per-Use)

Call `outlayer.near` contract directly:

```
Contract: outlayer.near
Method: request_execution
Gas: 100 TGas
Deposit: 0.025 NEAR (unused refunded)
```

**Arguments:**

```json
{
  "source": { "Project": { "project_id": "zavodil.near/near-email", "version_key": null } },
  "input_data": "{\"action\": \"send_email_plaintext\", \"to\": \"...\", ...}",
  "resource_limits": { "max_memory_mb": 512, "max_instructions": 2000000000, "max_execution_seconds": 120 },
  "response_format": "Json"
}
```

**CRITICAL:** The result is in the `outlayer.near` receipt's `SuccessValue` (base64-encoded JSON). Find the receipt where `executor_id === 'outlayer.near'`. Returns `{ "success": true, ... }` directly - NO `output` wrapper! Use `parseTransactionResult()` to decode it. See examples.

---

## Request Structure

All API calls use this structure:

```json
{
  "input": {
    "action": "action_name",
    // action-specific parameters
  }
}
```

Optional fields: `resource_limits` (recommended for NEAR Email - see below).

---

## Actions

### send_email

Send an email to any address (internal NEAR or external). Email content is encrypted client-side for on-chain privacy.

**Request:**
```json
{
  "action": "send_email",
  "encrypted_data": "base64-ecies-ciphertext",
  "ephemeral_pubkey": "02abc123def456..."
}
```

The `encrypted_data` field contains ECIES-encrypted JSON with email content:
```json
{
  "to": "recipient@example.com",
  "subject": "Email subject",
  "body": "Email body text",
  "attachments": []
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `encrypted_data` | string | Yes | Base64 ECIES ciphertext containing email payload (encrypt with your `send_pubkey`) |
| `ephemeral_pubkey` | string | No | 33-byte compressed secp256k1 pubkey (hex) for response encryption. If omitted, returns simple status without inbox/sent. |
| `max_output_size` | number | No | Max response size in bytes (default: 1,500,000) |

**Response (with ephemeral_pubkey):**
```json
{
  "success": true,
  "message_id": "abc123...",
  "encrypted_data": "base64-encrypted-inbox-and-sent"
}
```

**Response (without ephemeral_pubkey):**
```json
{
  "success": true,
  "message_id": "abc123..."
}
```

---

### send_email_plaintext

Send email without encryption. **For smart contract notifications only.**

**Warning:** Email content (to, subject, body) is stored PUBLICLY on the NEAR blockchain. Do NOT use for private messages.

**Use cases:**
- NFT sale notifications
- DeFi liquidation alerts
- DAO voting reminders

**Request:**
```json
{
  "action": "send_email_plaintext",
  "to": "user@near.email",
  "subject": "Your NFT was sold!",
  "body": "NFT #123 sold for 10 NEAR."
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient email |
| `subject` | string | Yes | Email subject line |
| `body` | string | Yes | Email body (plain text) |
| `attachments` | array | No | Array of attachment objects |

**Response:**
```json
{
  "success": true,
  "message_id": "uuid-if-internal-email"
}
```

`message_id` is returned only for internal (@near.email) recipients.

---

### get_emails

Fetch inbox and sent emails.

**Request:**
```json
{
  "action": "get_emails",
  "ephemeral_pubkey": "02abc123def456...",
  "inbox_offset": 0,
  "sent_offset": 0,
  "max_output_size": 1500000,
  "need_poll_token": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ephemeral_pubkey` | string | Yes | 33-byte compressed secp256k1 pubkey (hex) |
| `inbox_offset` | number | No | Pagination offset for inbox (default: 0) |
| `sent_offset` | number | No | Pagination offset for sent (default: 0) |
| `max_output_size` | number | No | Max response size (default: 1,500,000) |
| `need_poll_token` | boolean | No | Request poll token for lightweight polling |

**Response:**
```json
{
  "success": true,
  "encrypted_data": "base64-ecies-ciphertext",
  "send_pubkey": "02...",
  "inbox_next_offset": null,
  "sent_next_offset": 10,
  "inbox_count": 42,
  "sent_count": 15
}
```

**Decrypted `encrypted_data` structure:**
```json
{
  "inbox": [
    {
      "id": "uuid",
      "from": "sender@example.com",
      "subject": "Hello",
      "body": "Email content",
      "received_at": "2024-01-15T10:30:00Z",
      "attachments": [
        {
          "filename": "photo.jpg",
          "content_type": "image/jpeg",
          "data": "base64-content",
          "size": 54321
        }
      ]
    }
  ],
  "sent": [
    {
      "id": "uuid",
      "to": "recipient@example.com",
      "subject": "Re: Hello",
      "body": "Reply content",
      "sent_at": "2024-01-15T11:00:00Z",
      "tx_hash": "abc123..."
    }
  ],
  "poll_token": "token-for-polling"
}
```

---

### delete_email

Delete an email by ID.

**Request:**
```json
{
  "action": "delete_email",
  "email_id": "uuid-of-email",
  "ephemeral_pubkey": "02abc123def456...",
  "max_output_size": 1500000
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email_id` | string | Yes | UUID of email to delete |
| `ephemeral_pubkey` | string | Yes | 33-byte compressed secp256k1 pubkey (hex) |
| `max_output_size` | number | No | Max response size |

**Response:**
```json
{
  "success": true,
  "deleted": true,
  "encrypted_data": "base64-updated-inbox-and-sent"
}
```

---

### get_email_count

Get inbox and sent email counts (no encryption needed).

**Request:**
```json
{
  "action": "get_email_count"
}
```

**Response:**
```json
{
  "success": true,
  "inbox_count": 42,
  "sent_count": 15
}
```

---

### get_send_pubkey

Get sender's public key for encrypting outgoing emails. No encryption needed.

Use this action to get your pubkey once, then cache it (it's deterministic).

**Request:**
```json
{
  "action": "get_send_pubkey"
}
```

**Response:**
```json
{
  "success": true,
  "send_pubkey": "02abc123def456..."
}
```

The `send_pubkey` is a 33-byte compressed secp256k1 public key (hex-encoded).

---

### get_attachment

Fetch a large attachment by ID (for lazy-loaded attachments).

**Request:**
```json
{
  "action": "get_attachment",
  "attachment_id": "uuid-of-attachment",
  "ephemeral_pubkey": "02abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "size": 1234567,
  "encrypted_data": "base64-encrypted-attachment-content"
}
```

---

### get_master_public_key

Get the master public key (for advanced encryption scenarios).

**Request:**
```json
{
  "action": "get_master_public_key"
}
```

**Response:**
```json
{
  "success": true,
  "master_public_key": "02abc123def456..."
}
```

---

## Encryption

### EC01 Format

NEAR Email uses ECDH + ChaCha20-Poly1305 encryption:

```
EC01 (4 bytes)              - Magic identifier
ephemeral_pubkey (33 bytes) - Compressed secp256k1 public key
nonce (12 bytes)            - Random nonce
ciphertext (variable)       - Encrypted data + 16-byte auth tag
```

### Key Derivation

User public keys are derived from the master key:

```
user_pubkey = master_pubkey + SHA256("near-email:v1:" + account_id) * G
```

This allows encryption without knowing the master secret.

### Decryption Flow

1. Parse EC01 format
2. Extract ephemeral public key
3. Compute ECDH: `shared = your_privkey * ephemeral_pubkey`
4. Derive key: `key = SHA256(shared_x_coordinate)`
5. Decrypt with ChaCha20-Poly1305

---

## Limits

### Size Limits

| Limit | Value |
|-------|-------|
| Max response (Transaction) | 1.5 MB |
| Max response (Payment Key) | 25 MB |
| Max file per attachment | 5 MB |
| Max total email size | 7 MB |
| Max attachments per email | 10 |

### Lazy Loading

Attachments >= 2KB are stored separately and returned with `attachment_id` instead of `data`. Use `get_attachment` to fetch them.

### Resource Limits

| Parameter | Default | Max |
|-----------|---------|-----|
| `max_instructions` | 1B | 500B |
| `max_memory_mb` | 128 | 512 |
| `max_execution_seconds` | 60 | 180 |

---

## Error Responses

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common errors:

| Error | Description |
|-------|-------------|
| `Payment key required` | Missing X-Payment-Key header |
| `Insufficient balance` | Payment key balance too low |
| `Invalid recipient` | Email address format invalid |
| `Attachment too large` | File exceeds 5MB limit |
| `Total size exceeded` | Email exceeds 7MB total |

---

## Attachment Object

```json
{
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "data": "base64-encoded-content",
  "size": 12345,
  "attachment_id": "uuid-for-lazy-loading"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `filename` | string | Original filename |
| `content_type` | string | MIME type |
| `data` | string | Base64 content (small attachments only) |
| `size` | number | Size in bytes |
| `attachment_id` | string | ID for lazy loading (large attachments) |

---

## Email Object

### Inbox Email

```json
{
  "id": "uuid",
  "from": "sender@example.com",
  "subject": "Subject line",
  "body": "Email body text",
  "received_at": "2024-01-15T10:30:00Z",
  "attachments": []
}
```

### Sent Email

```json
{
  "id": "uuid",
  "to": "recipient@example.com",
  "subject": "Subject line",
  "body": "Email body text",
  "sent_at": "2024-01-15T11:00:00Z",
  "tx_hash": "near-transaction-hash",
  "attachments": []
}
```

---

## Smart Contract Integration

### request_execution Parameters

| Parameter | Value |
|-----------|-------|
| `source.Project.project_id` | `"zavodil.near/near-email"` |
| `source.Project.version_key` | `null` (use active) |
| `resource_limits.max_memory_mb` | `512` |
| `resource_limits.max_instructions` | `2000000000` |
| `resource_limits.max_execution_seconds` | `120` |
| `secrets_ref` | `null` (not needed) |
| `response_format` | `"Json"` |
| Attached deposit | 0.025 NEAR (unused refunded) |
| Gas | 100 TGas |
