# API Reference (Quick Version)

## Message Format (What Gets Stored)

Each line in `.whatsapp-messages/messages.jsonl`:

```json
{
  "timestamp": 1770124146686,
  "contact": "33612345678@c.us",
  "text": "Hello!",
  "type": "text",
  "fromMe": false,
  "hasMedia": false
}
```

**Key fields:**
- `timestamp` — When received (milliseconds)
- `contact` — Sender WhatsApp ID
- `text` — Message body
- `fromMe` — Did you send it?
- `type` — `text`, `image`, `audio`, etc.

---

## Webhook Payload (From WAHA)

What WAHA sends when a message arrives:

```json
{
  "event": "message.any",
  "payload": {
    "from": "33612345678@c.us",
    "body": "Hello!",
    "type": "text",
    "fromMe": false,
    "timestamp": 1770124146,
    "hasMedia": false
  }
}
```

---

## Service API

### Health Check

```bash
curl http://[YOUR_IP]:19000/health
```

Returns:
```json
{"ok": true, "messageCount": 42}
```

### Webhook Endpoint

```bash
POST http://[YOUR_IP]:19000/webhook
```

Accepts WAHA webhook payload. Returns:
```json
{"ok": true, "stored": true}
```

---

## Query CLI

### List all
```bash
node ~/.openclaw/workspace/whatsapp-query.js list
```

### Search
```bash
node ~/.openclaw/workspace/whatsapp-query.js search "doctor"
```

### Find appointments
```bash
node ~/.openclaw/workspace/whatsapp-query.js appointments
```

### List contacts
```bash
node ~/.openclaw/workspace/whatsapp-query.js contacts
```

### Export JSON
```bash
node ~/.openclaw/workspace/whatsapp-query.js export messages.json
```

---

## Contact ID Format

```
<country-code><phone-number>@c.us
```

Examples:
- France: `33612345678@c.us`
- US: `12015551234@c.us`

---

For more details: See `ADVANCED.md`
