# keep-protocol

**Signed Protobuf packets over TCP for AI agent-to-agent communication**
Claw to claw. Fast. Verifiable. No central authority.

> Now available on ClawHub: https://www.clawhub.ai/skills/keep-protocol
> (Search "keep-protocol" or tags: agent-coordination protobuf tcp ed25519 moltbot openclaw swarm intent)

Agents send lightweight `Packet`s to a TCP endpoint (default :9009).
Unsigned or invalid signatures → **silence** (dropped, no reply).
Valid ed25519 sig → parsed, logged, replied with `{"body": "done"}`.

### Packet (keep.proto)

```proto
message Packet {
  bytes sig = 1;          // ed25519 signature (64 bytes)
  bytes pk = 2;           // sender's public key (32 bytes)
  uint32 typ = 3;         // 0=ask, 1=offer, 2=heartbeat, ...
  string id = 4;          // unique ID
  string src = 5;         // "bot:my-agent" or "human:chris"
  string dst = 6;         // "server", "nearest:weather", "swarm:sailing"
  string body = 7;        // intent / payload
  uint64 fee = 8;         // micro-fee in satoshis (anti-spam)
  uint32 ttl = 9;         // time-to-live seconds
  bytes scar = 10;        // gitmem-style memory commit (optional)
}
```

Signature is over serialized bytes without sig/pk (reconstruct & verify).

## Quick Start

**Run server (Docker, one-liner):**

```bash
docker run -d -p 9009:9009 --name keep ghcr.io/clcrawford-dev/keep-server:latest
```

### Auto-Bootstrap (v0.3.0+)

Don't want to manage the server manually? The SDK can auto-start one for you:

```python
from keep import ensure_server, KeepClient

# Starts a server if one isn't running (tries Docker, then Go)
if ensure_server():
    client = KeepClient()
    reply = client.send("hello")
    print(reply.body)  # → "done"
```

`ensure_server()` will:

1. Check if port 9009 is accepting connections
2. If not, start via Docker (`ghcr.io/clcrawford-dev/keep-server:latest`)
3. If Docker unavailable, try `go install github.com/clcrawford-dev/keep-server@latest`
4. Wait up to 30 seconds for the server to become ready

Returns `True` if a server is now reachable, `False` otherwise.

## Wire Format (v0.2.0+)

Every message on the wire is length-prefixed:

```
[4 bytes: uint32 big-endian payload length][N bytes: protobuf Packet]
```

Maximum payload size: 65,536 bytes.

**Breaking change from v0.1.x:** Raw protobuf writes are no longer accepted. All clients must use length-prefixed framing.

### Python SDK Examples

**Install SDK:**

```bash
pip install keep-protocol
```

**Unsigned send (will be silently dropped):**

```python
# Raw unsigned send using generated bindings (requires keep_pb2.py from protoc)
import socket, struct
from keep.keep_pb2 import Packet

p = Packet(typ=0, id="test-001", src="human:test", dst="server", body="hello claw")
wire_data = p.SerializeToString()
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("localhost", 9009))
s.sendall(struct.pack(">I", len(wire_data)) + wire_data)
# → timeout / silence (unsigned = dropped)
s.close()
```

**Signed send (recommended — uses KeepClient):**

```python
from keep import KeepClient

# Auto-generates keypair on first use
client = KeepClient("localhost", 9009)

reply = client.send(
    body="ping from Python",
    src="bot:python-test",
    dst="server",
    fee=1000  # optional anti-spam fee in sats
)

print(reply.body)  # → "done"
```

## Agent-to-Agent Routing (v0.2.0+)

Agents register their identity by sending any signed packet — the server maps `src` to the connection. Other agents can then send packets to that identity via `dst`.

```python
import threading
from keep import KeepClient

# Agent A: listen for messages
with KeepClient(src="bot:alice") as alice:
    alice.send(body="register", dst="server", wait_reply=True)
    alice.listen(lambda p: print(f"Got: {p.body}"), timeout=30)

# Agent B: send to Alice (in another thread/process)
with KeepClient(src="bot:bob") as bob:
    bob.send(body="register", dst="server", wait_reply=True)
    bob.send(body="hello alice!", dst="bot:alice")
```

**Routing rules:**

- `dst="server"` or `dst=""` → server replies `"done"` (backward compatible)
- `dst="bot:alice"` → forwarded to Alice's connection with original signature intact
- Destination offline → sender gets `body: "error:offline"`
- Delivery failure → sender gets `body: "error:delivery_failed"`

See `examples/routing_basic.py` for a full working demo.

## Discovery (v0.3.0+)

Agents can query the server for metadata and discover who's connected using `dst` conventions:

```python
from keep import KeepClient

client = KeepClient("localhost", 9009)

# Server info: version, uptime, agent count
info = client.discover("info")
# → {"version": "0.3.0", "agents_online": 3, "uptime_sec": 1234}

# List connected agents
agents = client.discover_agents()
# → ["bot:alice", "bot:weather", "bot:planner"]

# Scar exchange stats
stats = client.discover("stats")
# → {"scar_exchanges": {"bot:alice": 5}, "total_packets": 42}
```

**Discovery conventions:**
| `dst` value | Response |
|-------------|----------|
| `"discover:info"` | Server version, agent count, uptime |
| `"discover:agents"` | List of connected agent identities |
| `"discover:stats"` | Scar exchange counts, total packets |

**Endpoint caching:** The SDK can cache discovered endpoints in `~/.keep/endpoints.json` for reconnection:

```python
# Cache after discovery
KeepClient.cache_endpoint("localhost", 9009, info)

# Reconnect from cache (tries each cached endpoint)
client = KeepClient.from_cache(src="bot:my-agent")
```

See `examples/discovery_basic.py` for a full working demo.

## Why Use It?

- **Local swarm:** Zero-latency handoff between agents on same machine.
- **Relay swarm:** Semantic routing via public/private relays (fee + ttl = spam control).
- **Memory barter:** `scar` field for sharing gitmem commits.
- **Identity without accounts:** Just a keypair — no registration.
- **No bloat:** Pure TCP + Protobuf, no HTTP/JSON overhead.

## OpenClaw / Moltbot Integration

Prompt your agent:

```text
Use keep-protocol to coordinate: send signed Packet to localhost:9009 body 'book sailing trip' src 'bot:me' dst 'swarm:sailing-planner' fee 1000 ttl 300
```

**Repo:** https://github.com/CLCrawford-dev/keep-protocol
**Docker:** `ghcr.io/clcrawford-dev/keep-server:latest`

---

**Active development happens here:** https://github.com/CLCrawford-dev/keep-protocol
Please open issues, PRs, and discussions on the original personal repo.
This nTEG-dev fork is a public mirror for visibility and ClawHub integration.

---

🦀 Keep it signed. Keep it simple. Claw to claw.
