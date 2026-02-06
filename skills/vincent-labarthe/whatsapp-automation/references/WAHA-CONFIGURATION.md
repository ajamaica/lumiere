# WAHA Configuration

Setup and configure WAHA (WhatsApp Web API) to send messages to your webhook.

## Step 1: Start WAHA Docker

```bash
docker run -it -p 3000:3000 --name waha devlikeapro/waha
```

Wait for: `WAHA is ready!`

Access dashboard: http://localhost:3000/dashboard/

---

## Step 2: Find Your Local IP

**CRITICAL:** Docker can't access localhost. Use your actual IP.

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Example output:
```
inet 192.168.1.102 netmask...
```

Use: `192.168.1.102`

---

## Step 3: Link WhatsApp

Dashboard → Click **Start New**

Scan QR code with your phone (30-60 sec timeout).

Wait for status: **WORKING** ✅

---

## Step 4: Configure Webhook

Dashboard → Your Session → Webhooks

Fill in:

**URL:**
```
http://192.168.1.102:19000/webhook
```
(Replace `192.168.1.102` with your actual IP)

**Events:** Check both:
- ✅ `message`
- ✅ `session.status`

Click **Update**

Session restarts. Wait for **WORKING** status.

---

## Step 5: Test Webhook

Send yourself a WhatsApp message.

Check service logs:
```bash
tail /tmp/whatsapp-store.log
```

Should show:
```
✅ Message stored: 33612345678@c.us - "your message"
```

---

## Troubleshooting

### QR Code Won't Scan

- Make sure phone has internet
- Scan within 30 seconds of QR appearing
- If fails, restart: `docker restart waha`

### Session Shows "STOPPED"

1. Check phone internet connection
2. Make sure WhatsApp still active on phone
3. In dashboard, click resume

### Webhook Not Receiving Messages

1. Check your IP (not localhost!)
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Did you click **Update** in dashboard?

3. Is service running?
   ```bash
   ps aux | grep whatsapp-message-store
   ```

4. Test health:
   ```bash
   curl http://192.168.1.102:19000/health
   ```

### Port 3000 Already in Use

```bash
docker run -it -p 3001:3000 --name waha devlikeapro/waha
# Access at http://localhost:3001
```

---

## Keep WAHA Running

### Option 1: Background Docker

```bash
docker run -d \
  -p 3000:3000 \
  --name waha \
  devlikeapro/waha

# Check logs anytime
docker logs waha

# Stop
docker stop waha
```

### Option 2: Docker with Persistent Storage

```bash
docker volume create waha-data

docker run -d \
  -p 3000:3000 \
  -v waha-data:/app/storage \
  --name waha \
  devlikeapro/waha
```

---

## WAHA Documentation

Official docs: https://waha.devlike.pro/

Key sections:
- Installation
- API Reference
- Webhook Format
- Troubleshooting

---

Back to Setup: See `SETUP.md`
