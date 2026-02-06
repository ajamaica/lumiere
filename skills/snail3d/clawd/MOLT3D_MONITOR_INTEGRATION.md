# MOLT3D Monitor → Main Session Integration Prompt

## Problem Statement

Currently, the ClawdSense analyzer runs autonomously in the background and detects motion/analyzes images, but **the main Clawdbot session has no visibility into these alerts**. You need to close this loop so alerts automatically flow from the analyzer to the main chat session.

## Architecture Overview

```
ClawdSense (ESP32)
    ↓ /photo, /video, /audio (HTTP POST)
Media Receiver (port 5555)
    ↓ Stores to ~/.clawdbot/media/inbound/
Analyzer (polling + Groq Vision)
    ↓ Detects motion, analyzes images
[NEW] Alert Forwarder (Node.js service)
    ↓ sessions_send() to main session
Main Clawdbot Session
    ↓ Receives alerts + context
Telegram MOLT3D group
    ↓ User sees the analysis
```

## Key Integration Points

### 1. **sessions_send() API**

- **Location:** Clawdbot's internal session routing
- **Signature:** `sessions_send({ sessionKey, message, label?, agentId?, timeoutSeconds? })`
- **Session Key for Main:** `agent:main:main` (or query from `sessions_list()`)
- **Message Format:** Plain text or JSON — anything you send arrives as a user message in the main session

### 2. **Alert Forwarder Service**

Create a new Node.js script (`alert-forwarder.js`) that:

1. **Watches the same media directory** as the analyzer
2. **Receives alerts from analyzer** (via IPC/file-based queue OR just polls the same images)
3. **Formats alerts** as structured messages with:
   - Timestamp
   - Image filename + path
   - Analysis result from Groq
   - Severity (motion only, suspicious activity, match alert)
4. **Sends via sessions_send()** to `agent:main:main`

### 3. **Two Implementation Options**

#### **Option A: File-Based Alert Queue (Simpler)**

- Analyzer writes analysis result + metadata to `~/.clawdbot/media/inbound/alerts.jsonl`
- Forwarder polls this file, reads new lines, sends via sessions_send()
- Forwarder marks lines as "sent" to avoid duplicates
- **Pros:** No inter-process coupling, easy debugging
- **Cons:** One more file to manage

#### **Option B: Direct Groq Integration in Forwarder (Cleaner)**

- Forwarder itself does the polling + Groq analysis (copy analyzer logic)
- Analyzer can optionally run in parallel OR be disabled
- Forwarder sends results directly to main session
- **Pros:** Single source of truth, no duplicate processing
- **Cons:** More complex forwarder code

**Recommendation:** Start with **Option A** (file queue) — it's modular and lets both services run independently.

---

## Implementation Steps

### Step 1: Modify `analyzer.js` to write alerts

After Groq analysis completes, append to alert queue:

```javascript
const alertsFile = path.join(process.env.HOME, '.clawdbot/media/inbound/alerts.jsonl')

// After analyzing image:
const alert = {
  timestamp: new Date().toISOString(),
  file: file,
  filePath: filePath,
  fileSize: stats.size,
  analysis: result,
  severity: determineSeverity(result), // "motion" | "suspicious" | "match"
}

fs.appendFileSync(alertsFile, JSON.stringify(alert) + '\n')
console.log(`📢 Alert queued`)
```

### Step 2: Create `alert-forwarder.js`

```javascript
#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const HOME = process.env.HOME
const alertsFile = path.join(HOME, '.clawdbot/media/inbound/alerts.jsonl')
const sentFile = path.join(HOME, '.clawdbot/media/inbound/.alerts-sent')

// Track which alerts we've already sent
let sentAlerts = new Set()
try {
  if (fs.existsSync(sentFile)) {
    sentAlerts = new Set(fs.readFileSync(sentFile, 'utf-8').split('\n').filter(Boolean))
  }
} catch (e) {
  console.warn('Could not read sent alerts:', e.message)
}

/**
 * Send alert to main Clawdbot session via sessions_send()
 * Uses the Clawdbot gateway HTTP API
 */
async function sendToMainSession(alert) {
  return new Promise((resolve, reject) => {
    const payload = {
      sessionKey: 'agent:main:main',
      message: `🎥 **MOTION ALERT** [${alert.severity}]\n\n📸 File: ${alert.file}\nTime: ${alert.timestamp}\n\n${alert.analysis}`,
    }

    const postData = JSON.stringify(payload)

    // Gateway runs on localhost:5000 by default
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/sessions_send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Optional: add auth token if gateway requires it
        // 'Authorization': `Bearer ${process.env.CLAWDBOT_TOKEN}`,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

/**
 * Poll alerts.jsonl for new alerts
 */
function startMonitoring() {
  console.log(`📊 Monitoring ${alertsFile} for new alerts...\n`)

  setInterval(async () => {
    if (!fs.existsSync(alertsFile)) return

    try {
      const lines = fs.readFileSync(alertsFile, 'utf-8').split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const alert = JSON.parse(line)
          const key = `${alert.timestamp}:${alert.file}`

          if (sentAlerts.has(key)) continue

          console.log(`📢 Sending alert: ${alert.file}`)
          await sendToMainSession(alert)

          sentAlerts.add(key)
          fs.appendFileSync(sentFile, key + '\n')

          console.log(`✅ Alert sent to main session\n`)
        } catch (e) {
          console.error(`⚠️  Error processing alert: ${e.message}`)
        }
      }
    } catch (e) {
      // Ignore read errors, keep polling
    }
  }, 1000) // Poll every 1 second
}

startMonitoring()
console.log(`🚀 Alert Forwarder ready.\n`)

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...')
  process.exit(0)
})
```

### Step 3: Update `health-monitor.js`

Add alert-forwarder to the services being monitored:

```javascript
const services = [
  { name: 'media-receiver', cmd: 'node scripts/media-receiver.js' },
  { name: 'analyzer', cmd: 'node scripts/analyzer.js' },
  { name: 'alert-forwarder', cmd: 'node scripts/alert-forwarder.js' }, // NEW
]
```

### Step 4: Test the flow

1. Start health-monitor: `cd ~/clawd/clawdsense-skill && node scripts/health-monitor.js`
2. Trigger a photo from ClawdSense: `/photo`
3. Watch the pipeline:
   - Media receiver captures it
   - Analyzer processes it
   - Alert forwarder sends to main session
   - You should see the alert arrive in your main chat

---

## Debugging Checklist

- [ ] **alertsFile exists:** `ls -la ~/.clawdbot/media/inbound/alerts.jsonl`
- [ ] **Analyzer is writing:** Check file size growth after `/photo`
- [ ] **Gateway API accessible:** `curl http://localhost:5000/api/sessions_send` (should 404 on GET, 200+ on POST with proper auth)
- [ ] **Session key correct:** Run `clawdbot sessions list` to find your main session key
- [ ] **Network latency:** If gateway is slow, increase `timeoutSeconds` in forwarder
- [ ] **Auth tokens:** If Clawdbot gateway requires auth, add it to the request headers

---

## API Reference: Clawdbot Gateway `sessions_send`

**Endpoint:** `POST http://localhost:5000/api/sessions_send`

**Request Body:**

```json
{
  "sessionKey": "agent:main:main",
  "message": "Your alert text here",
  "agentId": "main",
  "timeoutSeconds": 30
}
```

**Response:** `{ "status": "ok", "sessionId": "...", "message": "..." }`

---

## Next Steps After Implementation

1. ✅ Get the basic forwarder working
2. 📊 Add severity-based filtering (only send "suspicious" or "match" alerts, suppress pure "motion")
3. 🖼️ Attach actual image files to alerts (Clawdbot's message tool supports `filePath`)
4. 🎯 Add BOLOs from sentry-mode-skill integration (cross-check images against your BOLO list)
5. 📱 Send summary reports at end of day (collect 10+ alerts, consolidate, send once)

---

## Files to Modify/Create

- ✏️ `~/clawd/clawdsense-skill/scripts/analyzer.js` — Add `alerts.jsonl` writing
- ✨ `~/clawd/clawdsense-skill/scripts/alert-forwarder.js` — **NEW** Alert distribution service
- ✏️ `~/clawd/clawdsense-skill/scripts/health-monitor.js` — Add alert-forwarder to monitored services
- ✏️ `~/clawd/clawdsense-skill/SKILL.md` — Document the new architecture

---

**You're building a closed-loop system.** When it's done, every photo from ClawdSense will automatically flow into your main session with analysis attached. That's the foundation for everything else (sentry mode alerts, BOLO matching, anomaly detection, etc.).

Go build it! 🚀
