# AGENTS.md

## What is this project?

keep-protocol is a signed packet protocol for AI agent-to-agent communication
over TCP using Protobuf and ed25519 signatures. Agents use it to exchange
signed intent packets with semantic routing (`dst` field), anti-spam economics
(`fee`/`ttl` fields), and optional memory sharing (`scar` field).

## How to use keep-protocol in your agent

### Python — Ephemeral (one-shot send)

```python
from keep.client import KeepClient

client = KeepClient("localhost", 9009)
reply = client.send(
    src="bot:your-agent-name",
    dst="server",
    body="your intent here",
)
print(reply.body)  # "done"
```

### Python — Persistent (agent-to-agent routing)

```python
from keep.client import KeepClient

# Stay connected, register identity, receive routed messages
with KeepClient(src="bot:your-agent-name") as client:
    # Register with server (first signed packet registers src)
    client.send(body="hello", dst="server", wait_reply=True)

    # Send to another agent (fire-and-forget)
    client.send(body="coordinate task", dst="bot:other-agent")

    # Listen for incoming routed packets (heartbeats auto-filtered)
    client.listen(lambda p: print(f"From {p.src}: {p.body}"), timeout=30)
```

### Go

```go
import "github.com/teacrawford/keep-protocol"
```

### Raw TCP (any language)

1. Build a `Packet` protobuf message (see `keep.proto`) with all fields except `sig` and `pk`
2. Serialize to bytes
3. Sign those bytes with ed25519
4. Set `sig` (64 bytes) and `pk` (32 bytes) on the Packet
5. Serialize the full Packet to get `wire_data`
6. **Frame it:** prepend 4-byte big-endian uint32 of `len(wire_data)`
7. Send `[4-byte header][wire_data]` over TCP to port 9009
8. **Read reply frame:** read 4 bytes (length), then read that many bytes (protobuf Packet)

## Wire format (v0.2.0+)

Every message on the wire is length-prefixed:

```
[4 bytes: uint32 big-endian payload length][N bytes: protobuf Packet]
```

Maximum payload: 65,536 bytes. Oversized frames close the connection.

## Routing

The server maintains an identity-based routing table. Registration is implicit:
the first signed packet's `src` field maps that identity to the connection.

| `dst` value                            | Server behavior                                       |
| -------------------------------------- | ----------------------------------------------------- |
| `"server"` or `""`                     | Reply `body: "done"`                                  |
| `"discover:info"`                      | Reply with JSON: version, agents_online, uptime_sec   |
| `"discover:agents"`                    | Reply with JSON: list of connected agent identities   |
| `"discover:stats"`                     | Reply with JSON: scar_exchanges counts, total_packets |
| Registered agent (e.g., `"bot:alice"`) | Forward original signed packet to that agent          |
| Unknown identity                       | Reply `body: "error:offline"`                         |
| Forward write fails                    | Reply `body: "error:delivery_failed"`                 |

**Last-write-wins:** If a second connection registers the same `src`, the old connection is closed.

**Heartbeats:** Server sends `Packet{typ: 2, src: "server"}` every 60 seconds. The Python SDK filters these in `listen()`.

## Discovery (v0.3.0+)

Query the server for metadata without adding proto fields — uses `dst` conventions:

```python
from keep.client import KeepClient

client = KeepClient("localhost", 9009)

# Server info
info = client.discover("info")   # {"version": "0.3.0", "agents_online": N, "uptime_sec": N}

# Who's connected
agents = client.discover_agents() # ["bot:alice", "bot:weather"]

# Scar barter stats
stats = client.discover("stats") # {"scar_exchanges": {...}, "total_packets": N}
```

### Endpoint caching

The SDK caches discovered servers in `~/.keep/endpoints.json`:

```python
# Save after discovery
KeepClient.cache_endpoint("localhost", 9009, info)

# Reconnect from cache
client = KeepClient.from_cache(src="bot:my-agent")
```

Cache format:

```json
{
  "endpoints": [
    {
      "host": "localhost",
      "port": 9009,
      "version": "0.3.0",
      "last_seen": "2026-02-03T12:00:00+00:00"
    }
  ]
}
```

## Packet schema

```protobuf
message Packet {
  bytes  sig  = 1;   // ed25519 signature (64 bytes)
  bytes  pk   = 2;   // sender's public key (32 bytes)
  uint32 typ  = 3;   // 0=ask, 1=offer, 2=heartbeat
  string id   = 4;   // unique message ID
  string src  = 5;   // sender: "bot:my-agent" or "human:chris"
  string dst  = 6;   // destination: "server", "nearest:weather", "swarm:planner"
  string body = 7;   // intent or payload
  uint64 fee  = 8;   // micro-fee in sats (anti-spam)
  uint32 ttl  = 9;   // time-to-live in seconds
  bytes  scar = 10;  // gitmem-style memory commit (optional)
}
```

## Dev environment

- **Server language:** Go 1.23+
- **Client SDK:** Python 3.9+ (protobuf, cryptography)
- **Build server:** `docker build -t keep-server . && docker run -d -p 9009:9009 keep-server`
- **Build locally:** `go build -o keep .` (requires Go toolchain)
- **Run server:** `./keep` (listens on TCP :9009)

## Testing

Server must be running on `localhost:9009` before running tests.

```bash
# Signed packet test (expects "done" reply)
python3 test_signed_send.py

# Unsigned packet test (expects timeout / silent drop)
python3 test_send.py
```

## Code style

- Go: standard `gofmt`
- Python: stdlib + protobuf + cryptography only, no heavy frameworks
- Protobuf: `keep.proto` is the single source of truth for the Packet schema
- Commit messages: `type: description` (feat, fix, docs, chore, test)

## Important conventions

- All packets MUST be ed25519 signed — unsigned packets are silently dropped
- The signing payload is the Packet serialized with `sig` and `pk` fields zeroed
- The `src` field uses format `"type:name"` (e.g., `"bot:weather"`, `"human:chris"`)
- The `dst` field supports semantic routing: `"nearest:X"`, `"swarm:X"`, or direct names

## Architecture

```
[Agent A] --TCP:9009--> [Go Server] <--TCP:9009-- [Agent B]
   |                        |                        |
   | signed Packet          | routing table:         | signed Packet
   | src="bot:a"            |   "bot:a" -> conn A    | src="bot:b"
   | dst="bot:b"            |   "bot:b" -> conn B    | dst="bot:a"
   |                        |                        |
   |                        | forward to conn B ---> |
   | <-- "error:offline" -- | (if dst not found)     |
   | <-- (silence) -------- | (if unsigned/invalid)  |
```

## Do not

- Remove or weaken signature verification — it is a core security property
- Add HTTP/REST endpoints — TCP + Protobuf is intentional
- Add external dependencies beyond protobuf and ed25519
- Change the Packet schema without strong justification
