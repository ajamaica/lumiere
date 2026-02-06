# Troubleshooting

Quick fixes for common issues.

---

## Webhook Not Receiving Messages

**Check:**
1. Is service running?
   ```bash
   ps aux | grep whatsapp-message-store
   ```

2. Is webhook URL correct? (Check WAHA dashboard)
   - Should be: `http://192.168.x.x:19000/webhook`
   - NOT: `http://localhost:19000/webhook`

3. Did you click **Update** in WAHA dashboard after changing URL?

**Test:**
```bash
curl http://[YOUR_IP]:19000/health
# Should return: {"ok":true,...}
```

**If still failing:**
1. Restart WAHA: `docker restart waha`
2. Send test message
3. Check: `tail ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl`

---

## "Cannot read properties" Error

WAHA version mismatch.

```bash
docker pull devlikeapro/waha:latest
docker restart waha
```

---

## Port 19000 Already in Use

```bash
WHATSAPP_STORE_PORT=19001 node ~/.openclaw/workspace/whatsapp-message-store.js
```

Then update webhook URL to `:19001` in WAHA.

---

## Service Crashes on Startup

```bash
mkdir -p ~/.openclaw/workspace/.whatsapp-messages
node ~/.openclaw/workspace/whatsapp-message-store.js
```

---

## Cron Jobs Not Firing

**Check:**
1. Jobs exist?
   ```bash
   openclaw cron list
   ```

2. Telegram connected?
   ```bash
   openclaw status
   ```

3. Messages being stored?
   ```bash
   tail ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl
   ```

---

## WAHA QR Code Keeps Disappearing

Normal behavior—scan faster (30-60 sec timeout).

If session doesn't appear:
```bash
docker restart waha
# Wait 30 sec, then scan again
```

---

## Query Returns "No messages found"

Send a test message via WhatsApp first, then try:
```bash
node ~/.openclaw/workspace/whatsapp-query.js list
```

---

## High Memory Usage

Service using >200MB?

```bash
ps aux | grep node
```

If yes, restart:
```bash
killall node
nohup node ~/.openclaw/workspace/whatsapp-message-store.js > /tmp/whatsapp-store.log 2>&1 &
```

Or archive old messages:
```bash
tail -1000 ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl > temp.jsonl
mv temp.jsonl ~/.openclaw/workspace/.whatsapp-messages/messages.jsonl
```

---

## Can't Connect to WAHA (Docker Issues)

Check Docker running:
```bash
docker ps | grep waha
```

If not there, start it:
```bash
docker run -it -p 3000:3000 --name waha devlikeapro/waha
```

If already running but dashboard not responding:
```bash
docker restart waha
```

---

## Webhook URL Keeps Resetting

WAHA resets to localhost on restart.

Fix: Always set to your actual IP, not localhost.

Find IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Use that IP in webhook URL.

---

## View Detailed Logs

Service logs:
```bash
tail -f /tmp/whatsapp-store.log
```

WAHA logs:
```bash
docker logs -f waha
```

---

## Still Stuck?

1. Check WAHA docs: https://waha.devlike.pro/
2. Check OpenClaw docs: https://docs.openclaw.ai/
3. See `ADVANCED.md` for detailed debugging
