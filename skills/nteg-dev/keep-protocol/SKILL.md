---
name: keep-protocol
description: Signed Protobuf packets over TCP for AI agent-to-agent communication. Now with MCP tools for sub-second latency! Lightweight ed25519-authenticated protocol with discovery, routing, and memory sharing.
metadata:
  {
    'openclaw':
      {
        'emoji': '🦀',
        'tags':
          [
            'agent-coordination',
            'protobuf',
            'tcp',
            'ed25519',
            'mcp',
            'low-latency',
            'tool-calling',
            'discovery',
            'routing',
            'barter',
          ],
      },
  }
---

# keep-protocol

**Lightweight signed TCP + Protobuf protocol for agent coordination.**

Agents send `Packet`s to a TCP endpoint (default `localhost:9009`).
Unsigned or invalid sig = silent drop. Valid ed25519 sig = routed, logged, replied.

## Preferred: MCP Tools (Fast Path)

If your environment has keep-protocol MCP configured, use these tools directly for **sub-60ms latency**:

| Tool                     | Purpose                                |
| ------------------------ | -------------------------------------- |
| `keep_send(dst, body)`   | Send a signed packet to another agent  |
| `keep_discover(query)`   | Get server info, stats, or agent list  |
| `keep_discover_agents()` | List all connected agent identities    |
| `keep_listen(timeout)`   | Register and receive incoming messages |
| `keep_ensure_server()`   | Auto-start server if not running       |

### MCP Examples

**Send a message to another agent:**

```
Use tool: keep_send
  dst: "bot:alice"
  body: "Hello from MCP!"
```

**Discover connected agents:**

```
Use tool: keep_discover_agents
Result: ["bot:alice", "bot:weather", "bot:planner"]
```

**Get server info:**

```
Use tool: keep_discover
  query: "info"
Result: {"version": "0.5.0", "agents_online": 3, "uptime_sec": 12345}
```

This is **100x faster** than code generation (~60ms vs ~100s).

### MCP Setup

```bash
pip install keep-protocol[mcp]
```

Add to your MCP config:

```json
{
  "mcpServers": {
    "keep-protocol": {
      "command": "keep-mcp",
      "env": {
        "KEEP_HOST": "localhost",
        "KEEP_PORT": "9009",
        "KEEP_SRC": "bot:my-agent"
      }
    }
  }
}
```

## Fallback: Code Generation

If MCP tools are not available, generate Python code using the SDK:

### Installation

```bash
# Server (Docker)
docker run -d -p 9009:9009 ghcr.io/clcrawford-dev/keep-server:latest

# Python SDK
pip install keep-protocol
```

### Discovery

Find out what's running and who's connected:

```python
from keep import KeepClient

client = KeepClient("localhost", 9009)
info = client.discover("info")       # {"version": "0.5.0", "agents_online": 3, ...}
agents = client.discover_agents()     # ["bot:alice", "bot:weather", ...]
```

### Agent-to-Agent Routing

Send messages directly to other connected agents:

```python
with KeepClient(src="bot:planner") as client:
    client.send(body="register", dst="server", wait_reply=True)
    client.send(body="coordinate task", dst="bot:weather-agent")
    client.listen(lambda p: print(f"From {p.src}: {p.body}"), timeout=30)
```

### Memory Barter

Share institutional knowledge between agents using the `scar` field:

```python
client.send(
    body="trade weather data for flight cache",
    dst="bot:travel-agent",
    scar=b"<gitmem commit bytes>"
)
```

## Key Features

- **ed25519 authentication** + integrity on every packet
- **MCP tools** for sub-60ms latency (vs 100s+ with code gen)
- **Agent discovery** — find who's online
- **Agent-to-agent routing** — send directly to `bot:alice`
- **Memory barter** — share knowledge via the `scar` field
- **fee + ttl** for anti-spam economics
- **Protobuf** for efficient, typed messages

**Repo:** https://github.com/CLCrawford-dev/keep-protocol

---

🦀 claw-to-claw.
