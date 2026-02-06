# Installation Guide

## Quick Start (5 minutes)

### 1. Install the npm package

```bash
npm install -g openclaw-persistent-memory
```

### 2. Start the worker service

```bash
# Start in foreground (for testing)
openclaw-persistent-memory start

# Or run in background
nohup openclaw-persistent-memory start &
```

Verify it's running:
```bash
curl http://127.0.0.1:37778/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Install the OpenClaw extension

```bash
# Get the package location
PKG_PATH=$(npm root -g)/openclaw-persistent-memory

# Create extension directory
mkdir -p ~/.openclaw/extensions/openclaw-mem

# Copy extension files
cp $PKG_PATH/extension/index.ts ~/.openclaw/extensions/openclaw-mem/
cp $PKG_PATH/extension/openclaw.plugin.json ~/.openclaw/extensions/openclaw-mem/
cp $PKG_PATH/extension/package.json ~/.openclaw/extensions/openclaw-mem/

# Install extension dependencies
cd ~/.openclaw/extensions/openclaw-mem && npm install
```

### 4. Configure OpenClaw

Edit `~/.openclaw/openclaw.json` and add/update the plugins section:

```json
{
  "plugins": {
    "slots": {
      "memory": "openclaw-mem"
    },
    "allow": ["openclaw-mem"],
    "entries": {
      "openclaw-mem": {
        "enabled": true,
        "config": {
          "workerUrl": "http://127.0.0.1:37778",
          "autoCapture": true,
          "autoRecall": true,
          "maxContextTokens": 4000
        }
      }
    }
  }
}
```

### 5. Restart OpenClaw

```bash
openclaw gateway restart
```

---

## Automated Install Script

For convenience, you can use the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/webdevtodayjason/openclaw_memory/main/skill/install.sh | bash
```

Or if you have the skill installed via ClawHub:
```bash
./scripts/install.sh
```

---

## Verify Installation

### Check worker status
```bash
curl http://127.0.0.1:37778/api/stats
# Should show sessions and observations count
```

### Check OpenClaw logs
```bash
tail ~/.openclaw/logs/*.log | grep openclaw-mem
# Should show: "openclaw-mem: plugin registered"
```

### Test auto-recall
Send a message to your agent, then check logs:
```bash
tail ~/.openclaw/logs/*.log | grep "inject"
# Should show memory injection when relevant
```

---

## Troubleshooting

### Worker won't start
```bash
# Check if port is in use
lsof -i :37778

# Kill existing process
kill $(lsof -t -i:37778)

# Restart worker
openclaw-persistent-memory start
```

### Extension not loading
```bash
# Check extension directory
ls ~/.openclaw/extensions/openclaw-mem/

# Should have: index.ts, openclaw.plugin.json, package.json, node_modules/

# If missing node_modules:
cd ~/.openclaw/extensions/openclaw-mem && npm install
```

### Auto-recall not working
1. Check `plugins.slots.memory` is set to `"openclaw-mem"` (not `"memory-core"`)
2. Restart gateway after config changes
3. Check logs for errors: `tail ~/.openclaw/logs/*.log | grep -i error`

---

## Uninstall

```bash
# Remove extension
rm -rf ~/.openclaw/extensions/openclaw-mem

# Remove from openclaw.json plugins.slots.memory and plugins.entries.openclaw-mem

# Stop worker
kill $(lsof -t -i:37778)

# Uninstall npm package
npm uninstall -g openclaw-persistent-memory

# Optional: remove database
rm -rf ~/.openclaw-mem/
```
