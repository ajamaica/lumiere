# Agent-to-Agent Routing for keep-protocol v0.2.0

## Summary

Add message routing so agents can send packets to each other through the keep server, not just to the server itself. This is the minimum viable feature needed before publishing to ClawHub.

## Design Decisions

- **Implicit registration:** Agent's `src` field on first signed packet registers its identity in the routing table. No handshake needed.
- **Last-write-wins:** If two connections claim the same `src`, old connection is closed.
- **Offline = error:** If destination agent isn't connected, sender gets `body: "error:offline"`. No queuing.
- **Length-prefixed framing:** Each message gets a 4-byte big-endian length prefix. Required for correctness with persistent connections (TCP has no message boundaries). **This is a breaking wire format change** — hence v0.2.0.
- **No protocol schema changes:** `keep.proto` stays the same. Routing uses existing `src`/`dst`/`body` fields.
- **Server replies stay unsigned** — signing is a v0.3.0 concern.
- **No `nearest:X` or `swarm:X` routing** — exact-match identity only.

## Implementation Order

### Phase 1: Length-prefixed framing (keep.go + client.py)

Add `writePacket()` and `readPacket()` helpers using 4-byte big-endian length prefix:

```
[4 bytes: payload length][N bytes: protobuf Packet]
```

**Files:**

- `keep.go` — add `writePacket()`, `readPacket()` functions using `encoding/binary` and `io.ReadFull`. Replace all raw `c.Read(buf)`/`c.Write(b)` calls.
- `python/keep/client.py` — add `_send_framed()`, `_recv_framed()`, `_recv_exact()` helpers using `struct.pack(">I", ...)`. Update `send()` to use framed I/O.

### Phase 2: Server routing table (keep.go)

Replace address-keyed connection map with identity-keyed routing:

```go
var (
    agents  = make(map[string]net.Conn) // "bot:weather" -> conn
    connSrc = make(map[net.Conn]string) // conn -> "bot:weather" (reverse lookup)
    routeMu sync.RWMutex
)
```

Add `registerAgent()` and `unregisterConn()` helpers.

### Phase 3: Routing logic in handleConnection (keep.go)

Rewrite `handleConnection` to route based on `dst`:

- `dst == "server"` or `dst == ""` → reply "done" (backward compatible)
- `dst` matches registered agent → forward original signed packet to that agent's connection
- `dst` not found → reply `body: "error:offline"`
- Forward fails → reply `body: "error:delivery_failed"`

Forwarded packets preserve the original signature — the server is a transparent relay.

### Phase 4: Heartbeat update (keep.go)

Change heartbeat from raw `[]byte{2}` to a proper length-prefixed `Packet{Typ: 2, Src: "server"}`.

### Phase 5: Python SDK persistent connections (client.py)

Add to `KeepClient`:

- `connect()` / `disconnect()` — open/close persistent TCP socket
- `__enter__` / `__exit__` — context manager support
- `listen(callback, timeout=None)` — blocking loop that reads incoming packets
- `send()` gains `wait_reply` parameter: `True` for `dst="server"` (default), `False` for routed messages in persistent mode
- Ephemeral mode (original behavior) preserved when `connect()` not called

### Phase 6: Examples and docs

- New file: `examples/routing_basic.py` — two agents communicating through the server
- Update `AGENTS.md` — document routing, framing, persistent connections
- Update `README.md` — add routing section

### Phase 7: Version bump

- `python/keep/__init__.py` → 0.2.0
- `python/pyproject.toml` → 0.2.0

## Files to Modify

| File                        | Changes                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `keep.go`                   | Framing helpers, routing table, rewrite handleConnection, heartbeat update (~+80 lines) |
| `python/keep/client.py`     | Persistent connections, listen(), framing (~+70 lines)                                  |
| `python/keep/__init__.py`   | Version bump                                                                            |
| `python/pyproject.toml`     | Version bump                                                                            |
| `AGENTS.md`                 | Routing docs (~+30 lines)                                                               |
| `examples/routing_basic.py` | New file: routing demo (~30 lines)                                                      |

## Verification

1. Start server: `go build -o keep . && ./keep`
2. Test backward compat: existing `python_basic.py` still works with framing
3. Test routing: run `routing_basic.py` — Agent A sends to Agent B, B receives it
4. Test offline error: send to unregistered dst, verify `error:offline` reply
5. Test heartbeat: keep connection open >60s, verify heartbeat packet received
6. Build Docker image and re-test
