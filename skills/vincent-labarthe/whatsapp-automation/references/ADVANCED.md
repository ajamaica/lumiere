# Advanced Configuration

For power users who want to customize everything.

## Custom Appointment Keywords

Edit the cron job to add/remove patterns.

Current keywords:
- `appointment`, `meeting`, `scheduled`, `consultation`
- Time patterns: `2:30 PM`, `10 AM`, `Monday 3 PM`

To add custom:
```bash
openclaw cron update 89e6c0ad-ec35-403c-8697-5d2cc7e7cb43 \
  --patch '{"payload": {"message": "... keywords: appointment, meeting, scheduled, YOUR_KEYWORD ..."}}'
```

## Custom Important Keywords

Current keywords:
- Urgent: `urgent`, `ASAP`, `help`, `SOS`, `blocked`, `problem`, `error`
- Style: ALL CAPS, `!!!`, `???`

Add custom:
```bash
openclaw cron update 1eb55cf9-1776-4088-8643-81de370a2529 \
  --patch '{"payload": {"message": "... keywords: urgent, ASAP, help, YOUR_KEYWORD ..."}}'
```

## Custom Contact Handler

Watch a different contact instead of Joséphine.

Find contact ID:
```bash
node ~/.openclaw/workspace/whatsapp-query.js contacts
```

Update job:
```bash
openclaw cron update 06758784-662f-4223-9690-cd0ea1e58037 \
  --patch '{"payload": {"message": "... 33YOUR_CONTACT_ID@c.us ..."}}'
```

## Change Scan Frequency

Default: every 5 minutes (300,000 ms)

Change to 10 minutes:
```bash
openclaw cron update 89e6c0ad-ec35-403c-8697-5d2cc7e7cb43 \
  --patch '{"schedule": {"kind": "every", "everyMs": 600000}}'
```

## Environment Variables

### Change Webhook Port

Default: 19000

```bash
WHATSAPP_STORE_PORT=19001 node ~/.openclaw/workspace/whatsapp-message-store.js
```

Then update WAHA webhook URL to `:19001`

### Enable Debug Logging

```bash
DEBUG=whatsapp:* node ~/.openclaw/workspace/whatsapp-message-store.js
```

## Message Storage

### File Location
```
~/.openclaw/workspace/.whatsapp-messages/messages.jsonl
```

### File Format (JSONL)

Each line is one complete JSON object:

```json
{
  "timestamp": 1770124146686,
  "event": "message.any",
  "contact": "33612345678@c.us",
  "text": "Hello!",
  "type": "text",
  "hasMedia": false,
  "session": "default",
  "raw": { ... full WAHA payload ... }
}
```

### Archive Old Messages

Keep only last 1000 messages:
```bash
tail -1000 ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl > temp.jsonl
mv temp.jsonl ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl
```

Or backup entire file:
```bash
cp ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl \
   ~/.openclaw/workspace/.whatsapp-messages/messages.backup.$(date +%s).jsonl
```

## Query CLI Advanced

### Raw JSONL Output

```bash
node ~/.openclaw/workspace/whatsapp-query.js list --format=jsonl
```

### Filter by Date Range

```bash
# Not built-in, but you can:
grep "2026-02-03" ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl | jq .
```

### Contact Statistics

```bash
node ~/.openclaw/workspace/whatsapp-query.js contacts --stats
```

## Webhook API

### Health Check

```bash
curl http://[YOUR_IP]:19000/health
```

Response:
```json
{
  "ok": true,
  "messagesFile": "/path/to/messages.jsonl",
  "messageCount": 42
}
```

### Test Webhook Manually

```bash
curl -X POST http://[YOUR_IP]:19000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message.any",
    "payload": {
      "from": "33612345678@c.us",
      "body": "Test message",
      "type": "text",
      "fromMe": false,
      "timestamp": 1770124146
    }
  }'
```

## WAHA Advanced Configuration

### Use WAHA PLUS (Multiple Accounts)

WAHA Core = 1 session only  
WAHA PLUS = Multiple sessions

Paid version, see: https://waha.devlike.pro/docs/features/

### Custom WAHA Port

```bash
docker run -it -p 3001:3000 --name waha devlikeapro/waha
# Access at http://localhost:3001
```

### WAHA with Persistent Storage

```bash
docker volume create waha-data

docker run -it \
  -p 3000:3000 \
  -v waha-data:/app/storage \
  --name waha \
  devlikeapro/waha
```

### WAHA Background Mode

```bash
docker run -d \
  -p 3000:3000 \
  --name waha \
  devlikeapro/waha

# Check logs
docker logs waha

# Stop
docker stop waha
```

## Integration Examples

### Send Detected Appointment to Calendar

Cron job response:
```
If user says "yes", call:
  gog calendar add "Appointment with [contact]" "2026-02-05T14:30:00" --duration 1h
```

See OpenClaw docs for calendar integration.

### Store to Database

Modify `whatsapp-message-store.js` and add database write:

```javascript
// After storing to JSONL
const db = require('sqlite3').verbose();
db.run('INSERT INTO messages (timestamp, contact, text) VALUES (?, ?, ?)', 
  [msg.timestamp, msg.contact, msg.text]);
```

### Slack Alerts

Instead of Telegram, send to Slack:

```bash
openclaw cron update 89e6c0ad-ec35-403c-8697-5d2cc7e7cb43 \
  --patch '{"payload": {"channel": "slack"}}'
```

## Debugging

### View Service Logs

```bash
tail -f /tmp/whatsapp-store.log
```

### Check WAHA Logs

```bash
docker logs waha
docker logs -f waha  # Follow in real-time
```

### Check WAHA API

```bash
curl http://localhost:3000/api/sessions | jq .
```

### Query Message Count

```bash
wc -l ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl
```

### Test Parser

Manually test if a message matches appointment pattern:

```bash
node -e "
const text = 'Appointment Wednesday 2:30 PM';
const regex = /(?:appointment|meeting|scheduled).*?(\d{1,2}):(\d{2})/i;
console.log(text.match(regex));
"
```

## Contact ID Format

WhatsApp IDs in WAHA format:
```
<country-code><phone-number>@c.us
```

Examples:
- France: `33612345678@c.us`
- US: `12015551234@c.us`
- UK: `442012345678@c.us`

Note: Leading 0 removed from national format

## Performance Tuning

### For Large Message Files (>100MB)

1. Archive old messages
2. Keep only recent 10k lines
3. Monitor memory usage

```bash
ps aux | grep node
# Check MEM column
```

If using >200MB, restart service.

## Troubleshooting Advanced Issues

### Memory Leak

```bash
docker restart waha
ps aux | grep whatsapp-message-store
```

If still growing, kill and restart:
```bash
killall node
nohup node ~/.openclaw/workspace/whatsapp-message-store.js > /tmp/whatsapp-store.log 2>&1 &
```

### Webhook Delivery Failures

Check WAHA logs:
```bash
docker logs waha | grep -i webhook
```

If URL keeps resetting, use environment variable in Docker:
```bash
docker run -it \
  -p 3000:3000 \
  -e WAHA_WEBHOOK_URL=http://192.168.1.102:19000/webhook \
  devlikeapro/waha
```

### High Latency in Cron Jobs

Jobs run every 5 min but might be delayed. To run immediately:

```bash
openclaw cron run 89e6c0ad-ec35-403c-8697-5d2cc7e7cb43
```

---

For more: See TROUBLESHOOTING.md or WAHA docs at https://waha.devlike.pro/
