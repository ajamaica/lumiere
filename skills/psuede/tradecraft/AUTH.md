# Tradecraft Authentication

Authentication methods for accessing the Tradecraft API.

**Main Documentation:** [skills.md](https://tradecraft.finance/skills.md)

---

## Method 1: Agent Beta Signup (Recommended)

For fully autonomous AI agents that control an email address.

### Step 1: Beta Signup

**Endpoint:** `POST /api/public/beta-signup`

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email you control |
| `telegram` | string | No | Telegram handle |
| `twitter` | string | No | Twitter/X handle |
| `userType` | string | Yes | `trader`, `provider`, or `both` |
| `motivation` | text | Yes | Why you want access and intended use |

```bash
curl -X POST "https://api.tradecraft.finance/api/public/beta-signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "userType": "trader",
    "motivation": "Building AI trading agent for Solana token trading"
  }'
```

**Response:**

```json
{
  "success": true,
  "signupId": 123,
  "applicationSecret": "tc_app_a1b2c3d4e5f6...(64 hex chars)",
  "instructions": "Save your application secret securely..."
}
```

**CRITICAL:** Save the `applicationSecret` immediately - shown only once.

### Step 2: Wait for Approval

Admin review typically takes 24-48 hours.

**Detection Methods:**

**A. Email Monitoring** - Wait for approval email, then proceed to Step 3.

**B. Polling** - Call exchange endpoint until approved:

```python
import time
import requests

def poll_for_approval(email, secret, max_attempts=100):
    url = "https://api.tradecraft.finance/api/auth/exchange-secret"

    for attempt in range(max_attempts):
        response = requests.post(url, json={
            "email": email,
            "applicationSecret": secret
        })

        if response.status_code == 200:
            return response.json()  # Approved!
        elif response.status_code == 401:
            print(f"Attempt {attempt + 1}: Not approved yet...")
            time.sleep(5)  # Rate limit: 5 seconds
        elif response.status_code == 429:
            time.sleep(10)  # Rate limited
        else:
            break

    return None
```

### Step 3: Exchange Secret for API Key

**Endpoint:** `POST /api/auth/exchange-secret`

**Rate Limit:** 1 request per 5 seconds per email

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Your email from signup |
| `applicationSecret` | string | Yes | Secret from signup (`tc_app_{64_hex}`) |

```bash
curl -X POST "https://api.tradecraft.finance/api/auth/exchange-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "applicationSecret": "tc_app_a1b2c3d4e5f6..."
  }'
```

**Success Response:**

```json
{
  "status": "ok",
  "apiKey": "tc_live_xyz123...(80 hex chars)",
  "userId": 456,
  "username": "agent",
  "keyHint": "...xyz123ab",
  "scopes": [
    "trade:read",
    "trade:write",
    "wallets:read",
    "wallets:write",
    "signals:read",
    "signals:write",
    "groups:read",
    "groups:write"
  ],
  "message": "API key generated successfully. Save it securely."
}
```

**Error Response (Not Approved):**

```json
{
  "status": "error",
  "messages": [
    {
      "field": "general",
      "message": "Invalid credentials or account not yet approved."
    }
  ]
}
```

**Error Response (Rate Limited):**

```json
{
  "status": "error",
  "messages": [
    {
      "field": "general",
      "message": "Too many requests. Please wait 5 seconds."
    }
  ],
  "retryAfter": 5
}
```

**CRITICAL:** Save the `apiKey` - shown only once. Application secret is now invalidated.

### Step 4: Start Using API

```bash
curl -X GET "https://api.tradecraft.finance/v1/me" \
  -H "Authorization: Bearer tc_live_xyz123..."
```

---

## Method 2: Human-Created API Key

For agents working with human users who already have Tradecraft accounts.

### Steps

1. User visits https://tradecraft.finance
2. User navigates to **Settings > API Keys**
3. User creates a new API key with required scopes
4. User provides the API key to the agent

### Test Your Connection

```bash
# Health check (no auth required)
curl -X GET "https://api.tradecraft.finance/v1/health"

# Verify API key
curl -X GET "https://api.tradecraft.finance/v1/me" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Security Comparison

| Feature            | Agent Beta Signup     | Human-Created Key     |
| ------------------ | --------------------- | --------------------- |
| Human required     | No                    | Yes                   |
| Email verification | Required              | Optional              |
| Approval process   | 24-48 hours           | Instant               |
| One-time secret    | Yes                   | No                    |
| API key shown once | Yes                   | Yes                   |
| Best for           | **Autonomous agents** | Human-assisted agents |

---

## Important Notes

- **Application Secret Security**: Store securely until exchanged
- **One-Time Use**: Application secrets work only once
- **API Key Security**: Store securely - cannot be retrieved
- **Fair Use**: Subject to rate limits and policies
- **Single Key**: One API key per beta signup

---

## Error Codes

| Code                    | HTTP | Description                   |
| ----------------------- | ---- | ----------------------------- |
| `VALIDATION_ERROR`      | 400  | Invalid or missing fields     |
| `DUPLICATE_APPLICATION` | 409  | Email already has application |
| `INVALID_CREDENTIALS`   | 401  | Invalid email or secret       |
| `NOT_APPROVED`          | 401  | Account not yet approved      |
| `INVALID_SECRET_FORMAT` | 401  | Secret format invalid         |
| `KEY_ALREADY_EXISTS`    | 409  | API key already generated     |
| `ACCOUNT_NOT_FOUND`     | 404  | User account not found        |
| `RATE_LIMITED`          | 429  | Too many requests             |
