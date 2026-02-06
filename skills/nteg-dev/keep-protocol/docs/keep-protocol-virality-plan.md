# Keep-Protocol Virality Plan v1

**Status:** Active
**Created:** 2026-02-03
**Linear Project:** [keep-protocol v0.3.0 — Viral Adoption](https://linear.app/nteg-labs/project/keep-protocol-v030-viral-adoption-43093c13f961)

## Goal

Make keep-protocol the invisible glue for OpenClaw/Moltbot swarms. Target: 100+ active swarms, then iterate on data.

## Current State (Feb 2026)

**Discovery is the #1 bottleneck:**

- GitHub: Zero stars, one fork (nTEG-dev mirror), zero external PRs/issues
- ClawHub: 25 downloads, no ratings/comments
- X: One announcement post (1 like, 24 views), no external mentions
- Installation friction is low (Docker/pip work), value prop is clear in demos
- Problem: No one knows it exists

## Strategy: Pragmatic Virality

Focus on **low-risk, high-impact** changes that remove friction. Defer complexity until adoption data proves the need.

### What We're NOT Doing (Deferred)

| Item                            | Why Deferred                                          |
| ------------------------------- | ----------------------------------------------------- |
| Multicast discovery (224.0.0.1) | Blocked by cloud providers, needs Docker hacks        |
| `curl \| bash` bootstrap        | Supply chain risk, orgs block it                      |
| Rewards/reputation              | Rabbit hole — no abuse data yet to justify complexity |
| Error evangelism                | Feels spammy, let simplicity speak for itself         |
| Signed binaries (cosign)        | Add after adoption proves need                        |

## Phase 1: Core Friction Reducers (Week 1)

### KP-11: `client.ensure_server()` — Priority: Urgent

**The #1 friction point is "no keep server running."**

Python SDK method that:

1. Checks if port 9009 is open
2. If closed, auto-starts via Docker or `go install`
3. Returns success/failure with clear error messages

```python
from keep import Client

client = Client()
if client.ensure_server():
    # Server running, proceed
    client.connect()
```

### KP-13: Public Relay Deployment — Priority: High

Deploy 2-3 keep-server instances on Fly.io:

- Geographic distribution: US, EU, (optional) Asia
- Cost: ~$15-25/mo total
- Gives agents somewhere to connect immediately

### KP-12: DNS-Based Relay Discovery — Priority: High

**Blocked by:** KP-13 (need relays first)

- Configure `relays.keep-protocol.dev` with TXT/A records
- SDK `client.discover_relays()` queries DNS, caches results
- Works everywhere (cloud, Docker, local) — no multicast needed

## Phase 2: Scoped Discovery & Metrics (Week 2)

### KP-14: Local Discovery (`client.discover()`) — Priority: Medium

**Blocked by:** KP-11, KP-12, KP-13

For same-machine or LAN swarms:

- Scan localhost:9009 first
- Optional LAN scan (192.168.x.x, 10.x.x.x)
- Consider mDNS/Bonjour for elegance (adds zeroconf dependency)

### KP-15: Opt-In Telemetry — Priority: Medium

**Blocked by:** KP-11

We need data to iterate:

- Server `--telemetry` flag (default: off)
- Anonymous stats: packet count, arch, version, uptime
- NO PII: no IPs, no message content, no agent keys
- Simple dashboard for "what % of discovery attempts fail?"

## Dependency Graph

```
Week 1 (Parallel Start):
┌─────────────┐     ┌─────────────┐
│   KP-11     │     │   KP-13     │
│ ensure_     │     │ public      │
│ server()    │     │ relays      │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │   KP-12     │
       │            │ DNS         │
       │            │ discovery   │
       │            └──────┬──────┘
       │                   │
       ▼                   ▼
Week 2:
┌─────────────┐     ┌─────────────┐
│   KP-15     │     │   KP-14     │
│ telemetry   │     │ local       │
│             │     │ discover()  │
└─────────────┘     └─────────────┘
```

## Success Metrics

| Metric                   | Target            | How to Measure |
| ------------------------ | ----------------- | -------------- |
| GitHub stars             | 10+               | GitHub API     |
| ClawHub downloads        | 100+              | ClawHub stats  |
| Public relay connections | 50+ unique agents | Server logs    |
| X mentions               | 5+ external       | X search       |

## Resources Required

- 1-2 devs for SDK/proto work (Go + Python)
- 1 dev for DNS/relay setup
- Test swarm: 10 Moltbot instances for pre/post measurement

## Related Issues (Original Plan — Superseded)

The original plan (KP-7, KP-8, KP-9) included multicast, curl|bash, and rewards. Those issues remain in backlog for reference but are **superseded** by this pragmatic approach:

- KP-7: Phase 1 Quick Wins (original) — discovery features implemented, needs testing (KP-10)
- KP-8: Phase 2 Self-Propagation (original) — bootstrap binary, deferred
- KP-9: Phase 3 Polish & Monitor (original) — telemetry, partially covered by KP-15
- KP-10: Test KP-7 on staging — still relevant for existing discovery features

## Changelog

- **2026-02-03:** Created refined plan after team feedback. Prioritized pragmatic approach over ambitious scope. Created KP-11 through KP-15.
