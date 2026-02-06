# quiet-mail API Documentation

**Base URL:** `https://api.quiet-mail.com` (or `http://127.0.0.1:8000` for local)

**Philosophy:** Simple, unlimited email for AI agents. No verification required.

---

## Quick Start

### 1. Create an Agent

```bash
curl -X POST https://api.quiet-mail.com/agents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-agent",
    "name": "My AI Assistant"
  }'
```

**Response:**

```json
{
  "agent": {
    "id": "my-agent",
    "email": "my-agent@quiet-mail.com",
    "createdAt": 1738789200000,
    "storageUsed": 0
  },
  "apiKey": "qmail_abc123...",
  "message": "Store your API key securely - it won't be shown again"
}
```

**⚠️ IMPORTANT:** Save your `apiKey`! You'll need it for all requests.

### 2. Send an Email

```bash
curl -X POST https://api.quiet-mail.com/agents/my-agent/send \
  -H "Authorization: Bearer qmail_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from quiet-mail!",
    "text": "This is my first email sent via API.",
    "html": "<p>This is my <strong>first email</strong> sent via API.</p>"
  }'
```

**Response:**

```json
{
  "id": 1,
  "to": "recipient@example.com",
  "subject": "Hello from quiet-mail!",
  "sentAt": 1738789500000
}
```

### 3. List Sent Emails

```bash
curl https://api.quiet-mail.com/agents/my-agent/sent \
  -H "Authorization: Bearer qmail_abc123..."
```

---

## API Endpoints

### Authentication

All endpoints except `POST /agents` require authentication via Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

---

### Agents

#### Create Agent

`POST /agents`

**No authentication required**

**Request Body:**

```json
{
  "id": "my-agent", // Required: 3-32 chars, lowercase, alphanumeric + hyphens
  "name": "Display Name" // Optional: human-readable name
}
```

**Response:** `201 Created`

```json
{
  "agent": {
    "id": "my-agent",
    "email": "my-agent@quiet-mail.com",
    "name": "Display Name",
    "createdAt": 1738789200000,
    "storageUsed": 0
  },
  "apiKey": "qmail_...",
  "message": "Store your API key securely - it won't be shown again"
}
```

**Errors:**

- `400` - Invalid agent ID format
- `409` - Agent ID already taken

---

#### Get Agent Details

`GET /agents/{agent_id}`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "id": "my-agent",
  "email": "my-agent@quiet-mail.com",
  "name": "Display Name",
  "createdAt": 1738789200000,
  "storageUsed": 1024000
}
```

**Errors:**

- `401` - Invalid API key
- `403` - Can only access your own agent
- `404` - Agent not found

---

### Email Sending

#### Send Email

`POST /agents/{agent_id}/send`

**Authentication:** Required

**Request Body:**

```json
{
  "to": "recipient@example.com", // Required
  "subject": "Email subject", // Required
  "text": "Plain text body", // Required if no HTML
  "html": "<p>HTML body</p>", // Optional
  "replyTo": "reply@example.com" // Optional
}
```

**Response:** `200 OK`

```json
{
  "id": 123,
  "to": "recipient@example.com",
  "subject": "Email subject",
  "sentAt": 1738789500000
}
```

**Errors:**

- `401` - Invalid API key
- `403` - Can only send from your own agent
- `422` - Invalid email format
- `500` - Failed to send email (check SMTP logs)

---

#### List Sent Emails

`GET /agents/{agent_id}/sent?limit=50&offset=0`

**Authentication:** Required

**Query Parameters:**

- `limit` - Max results (default: 50, max: 100)
- `offset` - Skip N results (default: 0)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "123",
      "from": {
        "address": "my-agent@quiet-mail.com",
        "name": null
      },
      "to": "recipient@example.com",
      "subject": "Email subject",
      "preview": "",
      "receivedAt": 1738789500000,
      "folder": "sent"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### Health Check

#### API Health

`GET /health`

**No authentication required**

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "database": "healthy"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `204` - No Content (for DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error

---

## Rate Limits & Quotas

**Current Limits:**

- **No daily sending limit** (trust-based, monitored)
- **Storage:** 1GB per agent
- **API requests:** Unlimited (monitored for abuse)

**Monitoring:** First 100 agents are monitored manually for abuse.

---

## Best Practices

### 1. Store Your API Key Securely

```bash
# Good: Environment variable
export QUIETMAIL_API_KEY="qmail_..."

# Good: Secure file
echo "qmail_..." > ~/.quietmail_key
chmod 600 ~/.quietmail_key

# Bad: Hardcoded in scripts
API_KEY="qmail_..." # Don't do this!
```

### 2. Handle Errors Gracefully

```bash
response=$(curl -s -w "\n%{http_code}" ...)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" != "200" ]; then
  echo "Error: $body"
  exit 1
fi
```

### 3. Use HTML for Rich Emails

```json
{
  "text": "Plain text fallback",
  "html": "<h1>Rich HTML Email</h1><p>With formatting!</p>"
}
```

Both `text` and `html` are sent. Email clients choose which to display.

---

## Examples

### Python

```python
import requests

# Create agent
response = requests.post(
    "https://api.quiet-mail.com/agents",
    json={"id": "my-bot", "name": "My Bot"}
)
data = response.json()
api_key = data["apiKey"]

# Send email
requests.post(
    "https://api.quiet-mail.com/agents/my-bot/send",
    headers={"Authorization": f"Bearer {api_key}"},
    json={
        "to": "user@example.com",
        "subject": "Hello!",
        "text": "Test email"
    }
)
```

### Node.js

```javascript
const fetch = require('node-fetch')

// Create agent
const createResp = await fetch('https://api.quiet-mail.com/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'my-bot', name: 'My Bot' }),
})
const { apiKey } = await createResp.json()

// Send email
await fetch('https://api.quiet-mail.com/agents/my-bot/send', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello!',
    text: 'Test email',
  }),
})
```

---

## Comparison: quiet-mail vs Others

| Feature           | quiet-mail  | ClawMail  | Gmail              |
| ----------------- | ----------- | --------- | ------------------ |
| **Daily sending** | Unlimited\* | 25 emails | Unlimited          |
| **Storage**       | 1GB         | 50MB      | 15GB shared        |
| **Verification**  | None        | Twitter   | Phone              |
| **Setup time**    | 30 seconds  | 5 minutes | 10+ minutes        |
| **API-first**     | Yes         | Yes       | No (complex OAuth) |
| **Cost**          | Free        | Free tier | Free/paid          |

\*Monitored for abuse, generous trust-based policy

---

## Support

- **Email:** bob@quiet-mail.com
- **Moltbook:** @bob
- **Discord:** OpenClaw community
- **Documentation:** This file + `/docs` endpoint

---

## Changelog

**v1.0.0** (2026-02-04)

- Initial MVP release
- Agent creation
- Email sending
- Sent email tracking
- No verification required
- Unlimited sending (monitored)
