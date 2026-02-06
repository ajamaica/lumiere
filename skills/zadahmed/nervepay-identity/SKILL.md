---
name: nervepay-identity
description: Agent identity layer. Register DID, sign requests with Ed25519, prove WHO you are cryptographically.
metadata: {"openclaw":{"emoji":"🆔","requires":{"bins":["node","curl"],"env":["NERVEPAY_DID","NERVEPAY_PRIVATE_KEY"]},"primaryEnv":"NERVEPAY_PRIVATE_KEY"}}
---

# NervePay Identity — Agent Instructions

You are an AI agent with a NervePay identity. This skill lets you prove WHO you are using W3C DIDs and Ed25519 cryptographic signatures.

## What This Skill Does

- **Registers your identity**: Creates a unique DID (Decentralized Identifier) for you
- **Authenticates you**: Signs requests with Ed25519 so API providers know it's really you
- **Proves ownership**: Cryptographic verification that you control your identity
- **NO analytics tracking**: This skill is identity-only. Use `nervepay-analytics` for tracking or `nervepay` for both.

## Step 1: Download Helper Script

First, download the NervePay signing helper:

```bash
# Download signing script
curl -o nervepay-request.mjs https://nervepay.xyz/nervepay-request.mjs
chmod +x nervepay-request.mjs
```

This script handles Ed25519 signing for authenticated requests.

## Step 2: Register Your Identity

If you don't have `NERVEPAY_DID` and `NERVEPAY_PRIVATE_KEY` env vars, register first:

```bash
curl -X POST https://api.nervepay.xyz/v1/agent-identity/register-pending \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Agent Name",
    "description": "What you do"
  }'
```

**Save these from the response:**
- `did` → Set as `NERVEPAY_DID`
- `private_key` → Set as `NERVEPAY_PRIVATE_KEY`
- `mnemonic` → Backup for recovery (24 words)
- `claim_url` → Give to your human owner to claim you

You can start authenticating immediately. Human ownership (via claim_url) is optional but recommended for better trust scores.

## Making Authenticated Requests

Use the helper script to sign and send authenticated requests:

```bash
# Test authentication
node ./nervepay-request.mjs GET /v1/agent-identity/whoami

# Check your capabilities
node ./nervepay-request.mjs GET /v1/agent-identity/capabilities

# Authenticated POST (example)
node ./nervepay-request.mjs POST /v1/some-endpoint '{"key":"value"}'
```

The script handles Ed25519 signing automatically. It reads `NERVEPAY_DID`, `NERVEPAY_PRIVATE_KEY`, and `NERVEPAY_API_URL` (default: https://api.nervepay.xyz) from environment.

## What the Signature Proves

| Guarantee | How |
|-----------|-----|
| **Authentication** (who is calling) | Server verifies Ed25519 signature against your public key |
| **Integrity** (what was sent) | Signature covers method, path, query, body hash — tampering breaks verification |
| **Replay protection** | Unique nonce + timestamp prevents captured requests from reuse |
| **Portable identity** | Your DID carries reputation across all platforms that check NervePay headers |

## Required Headers (automatically added)

The helper script adds these automatically:
- `Agent-DID`: Your DID
- `X-Agent-Signature`: Base64-encoded Ed25519 signature
- `X-Agent-Nonce`: Unique nonce (UUID)
- `X-Signature-Timestamp`: ISO 8601 timestamp

## Common Commands

### Test authentication
```bash
node ./nervepay-request.mjs GET /v1/agent-identity/whoami
```

Returns your DID, name, reputation score, and confirms authentication works.

### Check your capabilities
```bash
node ./nervepay-request.mjs GET /v1/agent-identity/capabilities
```

Shows your spending limits, allowed operations, and permissions.

### Verify another agent
```bash
curl "https://api.nervepay.xyz/v1/agent-identity/verify/did:nervepay:agent:abc123xyz"
```

No auth required. Returns public profile, reputation, and transaction stats for any agent.

### Poll claim status (check if human claimed you)
```bash
curl "https://api.nervepay.xyz/v1/agent-identity/register-pending/SESSION_ID/status"
```

Returns: `pending`, `claimed`, `expired`, or `revoked`.

## Security Notes

- **Private key**: NEVER send to any server. Only send signatures.
- **Nonces**: Single-use. Generate new for each request (script handles this).
- **Timestamps**: Must be within 5 minutes of server time.
- **Mnemonic**: 24-word backup phrase. Store securely offline.

## Need Analytics Too?

This skill is identity-only. To track API usage and build reputation:
- Use `nervepay-analytics` skill for analytics-only
- Use `nervepay` skill for both identity + analytics

## Full API Reference

For complete endpoint documentation, error codes, and advanced usage, see:
- **Online:** https://nervepay.xyz/docs
- **Download API reference:** `curl -o api.md https://nervepay.xyz/api.md`

---

**API Base:** https://api.nervepay.xyz/v1
**Docs:** https://nervepay.xyz/docs
**GitHub:** https://github.com/nervepay/nervepay
