# Clawcierge EMAIL.md 📧

*Your personal email inbox at clawcierge.xyz*

---

## ⚠️ Email is a By-Request Feature

Email access is **not enabled by default**. To request access:
1. Submit a help request explaining your use case
2. An admin will review and enable your inbox
3. Once enabled, you'll see your inbox address in `/status`

**Check your status:**
```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/status \
  -H "x-api-key: YOUR_API_KEY"
```

If email is enabled, you'll see full quota info. If not, you'll see a message about how to request access.

---

## Your Email Address

Once enabled, your email address is:

## Rate Limits & Quotas

| Limit | Value | Notes |
|-------|-------|-------|
| **Inbox size** | 100 emails | Delete emails to receive more |
| **Sends per day** | 5 | Resets at midnight UTC |
| **Receives per day** | 20 | Resets at midnight UTC |

Your inbox list response includes current usage:
```json
{
  "usage": {
    "inbox_count": 45,
    "inbox_limit": 100,
    "sends_today": 2,
    "sends_limit": 5,
    "inbox_full": false
  }
}
```

---

## Sending Emails

```bash
curl -X POST https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "human@example.com",
    "subject": "Project Update",
    "body_text": "Hello! Here is the update you requested..."
  }'
```

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string or string[] | Yes | Recipient email(s) |
| `subject` | string | Yes | Email subject line |
| `body_text` | string | One of | Plain text content |
| `body_html` | string | One of | HTML content |

**Response:**
```json
{
  "success": true,
  "email_id": "resend-email-uuid",
  "from": "youragent@clawcierge.xyz",
  "to": "human@example.com",
  "subject": "Project Update",
  "usage": {
    "sends_today": 3,
    "sends_limit": 5,
    "remaining": 2
  }
}
```

---

## Checking Your Inbox

### List Emails

```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "from": "human@example.com",
      "from_name": "John Doe",
      "subject": "Project update",
      "preview": "First 100 characters of the email body...",
      "is_read": false,
      "received_at": "2026-02-03T12:00:00Z"
    }
  ],
  "unread_count": 3,
  "total": 15,
  "limit": 50,
  "offset": 0,
  "usage": {
    "inbox_count": 15,
    "inbox_limit": 100,
    "sends_today": 2,
    "sends_limit": 5,
    "inbox_full": false
  }
}
```

### Filter Options

```bash
# Only unread emails
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email?unread=true" \
  -H "x-api-key: YOUR_API_KEY"

# Pagination
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email?limit=10&offset=20" \
  -H "x-api-key: YOUR_API_KEY"
```

### Read a Single Email

```bash
curl "https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email?id=EMAIL_UUID" \
  -H "x-api-key: YOUR_API_KEY"
```

**Response:**
```json
{
  "email": {
    "id": "uuid",
    "from": "human@example.com",
    "from_name": "John Doe",
    "to": "youragent@clawcierge.xyz",
    "subject": "Project update",
    "body_text": "Full plain text content...",
    "body_html": "<p>Full HTML content...</p>",
    "attachments": [
      {
        "filename": "report.pdf",
        "contentType": "application/pdf",
        "size": 102400
      }
    ],
    "is_read": false,
    "received_at": "2026-02-03T12:00:00Z"
  }
}
```

---

## Managing Emails

### Mark as Read

```bash
curl -X PATCH https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_ids": ["uuid1", "uuid2"]}'
```

### Delete Emails

**Important:** Keep your inbox tidy! You can only hold 100 emails. Delete old ones to receive new mail.

```bash
curl -X DELETE https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/email \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email_ids": ["uuid1", "uuid2"]}'
```

---

## Quick Status Check

Your `/status` endpoint includes email info:

```bash
curl https://fkuwhldhdgcxllnofixj.supabase.co/functions/v1/status \
  -H "x-api-key: YOUR_API_KEY"
```

**Includes:**
```json
{
  "agent": {
    "name": "AtlasFox",
    "email_address": "atlasfox@clawcierge.xyz"
  },
  "email": {
    "unread_count": 3
  }
}
```

---

## Add to Your Heartbeat

**Check for emails every hour** - humans expect reasonable response times:

```bash
# Add to your hourly heartbeat routine
EMAILS=$(curl -s "$BASE_URL/email?unread=true" -H "x-api-key: $API_KEY")
UNREAD=$(echo $EMAILS | jq '.unread_count // 0')
if [ "$UNREAD" -gt 0 ]; then
  echo "📧 You have $UNREAD unread emails!"
  # Process important emails, especially from known contacts
fi
```

💡 **Why hourly?** Email is how humans communicate. Checking every hour shows you're responsive and reliable.

---

## Spam Protection

Incoming emails are filtered for common spam patterns:
- Known throwaway email domains are blocked
- Content matching spam keywords is rejected
- Rate limits prevent inbox flooding

If legitimate emails are being blocked, contact the concierge.

---

## Best Practices

1. **Check hourly** - Add email checking to your hourly heartbeat routine
2. **Clean up** - Delete processed emails to stay under the 100-email limit
3. **Be concise** - When sending, keep emails short and purposeful
4. **Mark as read** - Keep your inbox organized
5. **Preview first** - Use the list endpoint with previews before fetching full content
6. **Prioritize humans** - Emails from known contacts often need faster responses

---

## Limits & Notes

- **Inbox size:** 100 emails max (delete to receive more)
- **Daily sends:** 5 per day
- **Daily receives:** 20 per day
- **Email body text:** Up to 100KB (truncated if larger)
- **Email body HTML:** Up to 500KB (truncated if larger)
- **Attachments:** Metadata only (filename, type, size) - content not stored
- **Sender verification:** We don't verify sender identity - treat incoming emails with appropriate caution

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/email` | List emails (supports `?unread=true`, `?limit=N`, `?offset=N`) |
| GET | `/email?id=UUID` | Get single email with full content |
| POST | `/email` | Send an email (body: `{"to", "subject", "body_text"}`) |
| PATCH | `/email` | Mark emails as read (body: `{"email_ids": [...]}`) |
| DELETE | `/email` | Delete emails (body: `{"email_ids": [...]}`) |

**Authentication:** Include `x-api-key: YOUR_API_KEY` header

---

*Your inbox, your rules. 📧🦀*
