---
name: nervepay
description: Agent identity and analytics. Sign requests with Ed25519, track API usage, build reputation. Use after external API calls.
metadata: {"openclaw":{"emoji":"🔐","requires":{"bins":["node","curl"],"env":["NERVEPAY_DID","NERVEPAY_PRIVATE_KEY"]},"primaryEnv":"NERVEPAY_PRIVATE_KEY"}}
---

# NervePay — Agent Instructions

You are an AI agent with a NervePay identity. This skill lets you prove WHO you are (cryptographically) and track WHAT you do (analytics/reputation).

## What This Skill Does

- **Authenticates you**: Signs requests with Ed25519 so API providers know it's really you
- **Tracks your work**: Reports every external API call to build reputation
- **Builds trust**: Your verified usage history proves you're legitimate

## Setup: Get Your Identity

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

Use the helper script to sign and send requests:

```bash
# Authenticated GET
node {baseDir}/nervepay-request.mjs GET /v1/agent-identity/whoami

# Authenticated POST
node {baseDir}/nervepay-request.mjs POST /v1/agent-identity/track-service '{"service_name":"openai","endpoint":"/v1/chat/completions","success":true}'
```

The script handles Ed25519 signing automatically. It reads `NERVEPAY_DID`, `NERVEPAY_PRIVATE_KEY`, and `NERVEPAY_API_URL` (default: https://api.nervepay.xyz) from environment.

## ⚠️ MANDATORY: Track External API Usage ⚠️

**YOU MUST TRACK EVERY EXTERNAL API CALL. THIS IS NOT OPTIONAL.**

Every time you call OpenAI, Stripe, GitHub, weather APIs, or ANY external service, immediately report it to NervePay. This is the core purpose of this skill.

### Quick Track (Easiest)

Use the simplified tracking helper immediately after each external call:

```bash
# Minimal - just service, endpoint, and success/failure
node {baseDir}/nervepay-track.mjs openai /v1/chat/completions success

# With response time
node {baseDir}/nervepay-track.mjs openai /v1/chat/completions success 1250

# With cost
node {baseDir}/nervepay-track.mjs stripe /v1/charges success 850 10.00
```

### Full Track (More Details)

For complete tracking with all fields:

```bash
node {baseDir}/nervepay-request.mjs POST /v1/agent-identity/track-service '{
  "service_name": "openai",
  "endpoint": "/v1/chat/completions",
  "method": "POST",
  "success": true,
  "response_time_ms": 1250,
  "amount": "0.05",
  "currency": "USD"
}'
```

### Example Workflow (DO THIS)

```bash
# 1. Call external API
response=$(curl https://api.openai.com/v1/chat/completions ...)

# 2. IMMEDIATELY track it (don't forget!)
node {baseDir}/nervepay-track.mjs openai /v1/chat/completions success

# 3. Continue with your work
echo "$response"
```

**Why tracking is mandatory:**
- Builds your reputation score (proves you're legitimate)
- Shows API providers your verified usage history
- Tracks costs and success rates across all services
- This is literally what NervePay exists for - without tracking, you're not using it

**Remember:** Track IMMEDIATELY after the call, not later. Make it a habit.

## 🚀 AUTOMATIC TRACKING (Recommended for Lazy Agents)

**Tired of remembering to track?** Use auto-instrumentation - it intercepts ALL HTTP calls automatically!

### How Auto-Instrumentation Works

The `nervepay-instrument.mjs` script monkey-patches Node.js's `fetch()`, `http.request()`, and `https.request()` to automatically track every external API call. Zero code changes needed!

### Setup: Load Instrumentation

**Option 1: Command-line flag (recommended)**
```bash
node --import {baseDir}/nervepay-instrument.mjs your-agent.js
```

**Option 2: Environment variable (global)**
```bash
export NODE_OPTIONS="--import /path/to/nervepay-instrument.mjs"
node your-agent.js
```

**Option 3: Programmatic (in your code)**
```javascript
// At the very top of your entry file
import './nervepay-skill/nervepay-instrument.mjs';

// Now all HTTP calls are auto-tracked!
await fetch('https://api.openai.com/...');  // Automatically tracked
```

### What Gets Tracked Automatically

✅ All `fetch()` calls to external APIs
✅ All `http.request()` and `https.request()` calls
✅ Success/failure status
✅ Response time in milliseconds
✅ HTTP status codes

❌ NOT tracked: Calls to NervePay itself (avoids infinite loop)
❌ NOT tracked: localhost / internal IPs (192.168.x.x, 10.x.x.x)

### Disable Auto-Tracking

```bash
export NERVEPAY_AUTO_TRACK=false
```

### Example

```bash
# Set your credentials
export NERVEPAY_DID="your-did"
export NERVEPAY_PRIVATE_KEY="your-key"

# Run your agent with auto-instrumentation
node --import {baseDir}/nervepay-instrument.mjs your-agent.js

# All HTTP calls in your-agent.js are now automatically tracked!
```

**Bottom line:** With auto-instrumentation, you literally cannot forget to track. It just happens. 🎉

## Pairing with OpenClaw Gateways (ClawBot Auto-Configuration)

If you're an agent like ClawBot that manages OpenClaw gateway instances, you can auto-configure gateways using NervePay's pairing flow.

### Prerequisites

**You MUST have a NervePay identity first!** Complete the "Setup: Get Your Identity" section above to register and get your `NERVEPAY_DID` and `NERVEPAY_PRIVATE_KEY` before pairing.

**Recommended:** Have your human owner claim you via the `claim_url` for better trust scores before pairing gateways.

### How Pairing Works

1. **First time:** Register your agent identity and optionally get claimed by human owner
2. **User generates pairing code** in NervePay dashboard (10-minute expiry)
3. **You authenticate** with your agent DID (Ed25519 signature) and send gateway details
4. **NervePay stores** the encrypted gateway token and links it to your DID
5. **Only you** can refresh the token later (verified by your DID)

### Complete Pairing

When your human tells you to "connect to nervepay [CODE]":

```bash
# 1. Collect gateway details from your environment/config
PAIRING_CODE="ABC123"  # From user
GATEWAY_URL="https://your-openclaw-gateway.com"
GATEWAY_TOKEN="your-gateway-bearer-token"
GATEWAY_NAME="My Gateway"

# 2. Send pairing request (authenticated with your agent DID)
node {baseDir}/nervepay-request.mjs POST /v1/integrations/openclaw/pairing/complete '{
  "pairing_code": "'$PAIRING_CODE'",
  "gateway_url": "'$GATEWAY_URL'",
  "gateway_token": "'$GATEWAY_TOKEN'",
  "gateway_name": "'$GATEWAY_NAME'",
  "max_concurrent_agents": 8,
  "default_timeout_seconds": 3600
}'
```

**Response on success:**
```json
{
  "gateway_id": "uuid-here",
  "gateway_name": "My Gateway",
  "status": "completed",
  "message": "Gateway 'My Gateway' successfully paired with agent did:nervepay:agent:xyz"
}
```

### Refresh Gateway Token

When your OpenClaw gateway token rotates, push the new token:

```bash
GATEWAY_ID="gateway-uuid-from-pairing"
NEW_TOKEN="new-gateway-bearer-token"

node {baseDir}/nervepay-request.mjs POST /v1/integrations/openclaw/gateways/$GATEWAY_ID/refresh-token '{
  "new_token": "'$NEW_TOKEN'"
}'
```

**Security:** NervePay verifies you're the agent that originally paired the gateway (checks `linked_agent_did`). Only you can refresh this gateway's token.

### Why Pairing?

- **Zero manual setup** for users (just give them a code)
- **Cryptographic auth** proves you control the gateway
- **Token encryption** keeps gateway credentials secure (AES-256-GCM)
- **Auto-expiration detection** if gateway returns 401, NervePay marks token as expired
- **Trust**: Your verified DID proves the gateway is managed by you

## Common Commands

### Test authentication
```bash
node {baseDir}/nervepay-request.mjs GET /v1/agent-identity/whoami
```

Returns your DID, name, reputation score, and confirms authentication works.

### Check your capabilities
```bash
node {baseDir}/nervepay-request.mjs GET /v1/agent-identity/capabilities
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

## What the Signature Proves

| Guarantee | How |
|-----------|-----|
| **Authentication** (who is calling) | Server verifies Ed25519 signature against your public key |
| **Integrity** (what was sent) | Signature covers method, path, query, body hash — tampering breaks verification |
| **Replay protection** | Unique nonce + timestamp prevents captured requests from reuse |
| **Portable identity** | Your DID carries reputation across all platforms that check NervePay headers |

## Required Headers (already handled by script)

The helper script adds these automatically:
- `Agent-DID`: Your DID
- `X-Agent-Signature`: Base64-encoded Ed25519 signature
- `X-Agent-Nonce`: Unique nonce (UUID)
- `X-Signature-Timestamp`: ISO 8601 timestamp

## Security Notes

- **Private key**: NEVER send to any server. Only send signatures.
- **Nonces**: Single-use. Generate new for each request (script handles this).
- **Timestamps**: Must be within 5 minutes of server time.
- **Mnemonic**: 24-word backup phrase. Store securely offline.

## Full API Reference

See `{baseDir}/api.md` for complete endpoint documentation, error codes, and advanced usage.

---

**API Base:** https://api.nervepay.xyz/v1
**Docs:** https://nervepay.xyz/docs
**GitHub:** https://github.com/nervepay/nervepay
