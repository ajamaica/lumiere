# Setup Guide

Quick setup without all the fluff.

## 1. Start WAHA Docker

```bash
docker run -it -p 3000:3000 --name waha devlikeapro/waha
```

Wait for: `WAHA is ready!`

## 2. Get Your Local IP

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Example: `192.168.1.102`

## 3. Link WhatsApp Account

Open: http://localhost:3000/dashboard

- Click **Start New**
- Scan QR code with your phone
- Wait for status to show **WORKING**

## 4. Start Message Store Service

New terminal:

```bash
nohup node ~/.openclaw/workspace/whatsapp-message-store.js > /tmp/whatsapp-store.log 2>&1 &
```

Check running:
```bash
ps aux | grep whatsapp-message-store
```

## 5. Configure Webhook in WAHA

Dashboard → Your Session → Webhooks

1. **URL:** `http://[YOUR_IP]:19000/webhook`
   - Replace `[YOUR_IP]` with your actual IP (e.g., `192.168.1.102`)
   - NOT localhost!

2. **Events:** ✅ `message` and ✅ `session.status`

3. Click **Update**

## 6. Test It Works

Send yourself a WhatsApp message.

Check logs:
```bash
tail -f /tmp/whatsapp-store.log
```

Should show:
```
✅ Message stored: 33612345678@c.us - "your message"
```

Or query:
```bash
node ~/.openclaw/workspace/whatsapp-query.js list
```

## 7. Set Up Auto-Start (Optional but Recommended)

So service restarts after reboot:

```bash
cat > ~/Library/LaunchAgents/com.whatsapp.store.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.whatsapp.store</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/vincentlabarthe/.openclaw/workspace/whatsapp-message-store.js</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.whatsapp.store.plist
```

## Done! ✅

Service running. Cron jobs active. You're set.

---

## Troubleshooting

**Webhook not receiving?**
- Check your IP (not localhost)
- Did you click Update in WAHA?
- Check health: `curl http://[YOUR_IP]:19000/health`

**Port 19000 in use?**
```bash
WHATSAPP_STORE_PORT=19001 node ~/.openclaw/workspace/whatsapp-message-store.js
```

**Service crashed?**
```bash
tail /tmp/whatsapp-store-error.log
```

More help: See `TROUBLESHOOTING.md`
