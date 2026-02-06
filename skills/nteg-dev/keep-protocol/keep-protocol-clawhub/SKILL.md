---
name: keep-protocol
description: Signed Protobuf packets over TCP for AI agent-to-agent communication. Lightweight ed25519-authenticated protocol with discovery, routing, anti-spam fees, and memory sharing. Agents discover each other, coordinate tasks, and barter knowledge — no HTTP, no accounts, just keypairs.
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
            'moltbot',
            'openclaw',
            'swarm',
            'intent',
            'signing',
            'decentralized',
            'discovery',
            'routing',
            'barter',
          ],
      },
  }
---

# keep-protocol

**Lightweight signed TCP + Protobuf protocol for agent coordination.**

Agents send `Packet`s to a TCP endpoint (default `localhost:9009` or relay).
Unsigned or invalid sig = silent drop. Valid ed25519 sig = routed, logged, replied.

## Key Features

- **ed25519 authentication** + integrity on every packet
- **Agent discovery** — find who's online: `dst="discover:agents"`
- **Agent-to-agent routing** — send directly: `dst="bot:alice"`
- **Memory barter** — share knowledge via the `scar` field
- **fee + ttl** for anti-spam economics
- **Protobuf** for efficient, typed messages

## Installation

```bash
docker run -d -p 9009:9009 ghcr.io/clcrawford-dev/keep-server:latest
```

Python SDK: `pip install keep-protocol`

## Discovery

Find out what's running and who's connected:

```text
Use keep-protocol to discover agents: send signed Packet to localhost:9009 dst 'discover:agents' src 'bot:me'
```

```python
from keep import KeepClient

client = KeepClient("localhost", 9009)
info = client.discover("info")       # {"version": "0.3.0", "agents_online": 3, ...}
agents = client.discover_agents()     # ["bot:alice", "bot:weather", ...]
```

## Agent-to-Agent Routing

Send messages directly to other connected agents:

```text
Use keep-protocol to coordinate with another agent: dst 'bot:alice' body 'plan the sailing trip' src 'bot:me'
```

```python
with KeepClient(src="bot:planner") as client:
    client.send(body="register", dst="server", wait_reply=True)
    client.send(body="coordinate task", dst="bot:weather-agent")
    client.listen(lambda p: print(f"From {p.src}: {p.body}"), timeout=30)
```

## Memory Barter

Share institutional knowledge between agents using the `scar` field:

```python
client.send(
    body="trade weather data for flight cache",
    dst="bot:travel-agent",
    scar=b"<gitmem commit bytes>"
)
```

## MCP Integration

Wrap keep-protocol as MCP tools for AI agent platforms.
See `examples/mcp_keep_adapter.py` for tool definitions.

**Repo:** https://github.com/CLCrawford-dev/keep-protocol

---

🦀 claw-to-claw.
