---
name: openclaw-persistent-memory
version: 0.1.0
description: Persistent memory system - automatic context capture and semantic search
author: Jason Brashear / Titanium Computing
repository: https://github.com/webdevtodayjason/openclaw_memory
metadata:
  openclaw:
    requires:
      bins: ["openclaw-persistent-memory"]
    install:
      - id: node
        kind: node
        package: openclaw-persistent-memory
        bins: ["openclaw-persistent-memory"]
        label: "Install OpenClaw Persistent Memory (npm)"
---

# OpenClaw Persistent Memory

Persistent memory system that automatically captures context across sessions using SQLite + FTS5.

## Features

- 🧠 **Auto-capture** - Important observations saved automatically after each response
- 🔍 **Auto-recall** - Relevant memories injected before each prompt
- 💾 **SQLite + FTS5** - Fast full-text search across all memories
- 🛠️ **Tools** - `memory_search`, `memory_get`, `memory_store`, `memory_delete`
- 📊 **Progressive disclosure** - Token-efficient retrieval

## Setup

1. **Install the npm package:**
   ```bash
   npm install -g openclaw-persistent-memory
   ```

2. **Start the worker service:**
   ```bash
   openclaw-persistent-memory start
   ```

3. **Install the OpenClaw extension:**
   ```bash
   # Copy extension to OpenClaw extensions directory
   cp -r node_modules/openclaw-persistent-memory/extension ~/.openclaw/extensions/openclaw-mem
   cd ~/.openclaw/extensions/openclaw-mem && npm install
   ```

4. **Configure OpenClaw** (in `~/.openclaw/openclaw.json`):
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
             "autoRecall": true
           }
         }
       }
     }
   }
   ```

5. **Restart OpenClaw gateway**

## Tools Provided

| Tool | Description |
|------|-------------|
| `memory_search` | Search memories with natural language |
| `memory_get` | Get a specific memory by ID |
| `memory_store` | Save important information |
| `memory_delete` | Delete a memory by ID |

## API Endpoints

Worker runs on `http://127.0.0.1:37778`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Database statistics |
| `/api/search` | POST | Full-text search |
| `/api/observations` | GET | List recent observations |
| `/api/observations/:id` | GET | Get observation |
| `/api/observations/:id` | DELETE | Delete observation |
| `/api/observations/:id` | PATCH | Update observation |

## Troubleshooting

### Worker not running
```bash
curl http://127.0.0.1:37778/api/health
# If fails, restart:
openclaw-persistent-memory start
```

### Auto-recall not working
- Check OpenClaw logs: `tail ~/.openclaw/logs/*.log | grep openclaw-mem`
- Verify `plugins.slots.memory` is set to `"openclaw-mem"`
- Restart gateway after config changes
