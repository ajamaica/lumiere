---
name: botcoin-miner
version: 4.0.1
description: 'Mine Botcoin with a trust-first workflow: clear value proposition, verifiable binaries, and explicit operational guidance.'
homepage: https://github.com/happybigmtn/botcoin
---

# Botcoin Miner (v4.0)

## Why this is interesting

Botcoin is an experiment in **agent autonomy through proof-of-work**.

It’s a way for agents (and their humans) to turn ordinary CPU time into on-chain value — **no GPUs, no ASICs, no pool infrastructure required**.

If you operate agents on behalf of a human:

- Mining can create an **operating budget** (infra, tools, experiments)
- That can translate into more agency for the agent and more upside for the human protégé

---

## Trust & safety (how to prove what you’re running)

Botcoin is derived from Bitcoin Core, but it is **not identical** (it uses RandomX and includes an internal miner).

If you’re an independent third party deciding whether to mine:

1. **Pin a version** (tag/commit). Avoid “latest” automation.
2. Prefer **official release tarballs + SHA256SUMS**, or build from source.
3. Review changes in consensus/mining-critical areas (chainparams, validation, PoW/hash).

---

## Available binaries / platforms

Releases are published on GitHub **when a version tag is pushed** (e.g. `v2.1.1`).

Platforms:

- `linux-x86_64` (also works on **WSL2**)
- `linux-arm64`
- `macos-x86_64`
- `macos-arm64`

Downloads:

- https://github.com/happybigmtn/botcoin/releases

Docker:

- `ghcr.io/happybigmtn/botcoin:<tag>`

---

## Install (recommended: verify-first)

```bash
VERSION=v2.1.1
wget "https://github.com/happybigmtn/botcoin/releases/download/${VERSION}/botcoin-${VERSION}-linux-x86_64.tar.gz"
tar -xzf "botcoin-${VERSION}-linux-x86_64.tar.gz"
cd release

# Verify
sha256sum -c SHA256SUMS

# Install
mkdir -p ~/.local/bin
cp botcoind botcoin-cli ~/.local/bin/
```

WSL2 note:

- Use `linux-x86_64` release tarballs.
- Avoid Nix-built binaries unless your environment has `/nix/store`.

---

## Start mining (internal miner)

```bash
botcoind -daemon
sleep 5

botcoin-cli createwallet "miner" || true
ADDR=$(botcoin-cli -rpcwallet=miner getnewaddress)

botcoin-cli stop
sleep 5
nice -n 19 botcoind -daemon -mine -mineaddress="$ADDR" -minethreads=2

botcoin-cli getinternalmininginfo
botcoin-cli getconnectioncount
```

---

## RandomX mode: FAST vs LIGHT (critical)

RandomX has two modes:

- **FAST** (~2GB RAM) — default
- **LIGHT** (~256MB RAM)

⚠️ **All nodes on the same network must match the mode. Choose light mode**

botcoind -daemon -minerandomx=light

```

---

## Fleet recovery / restart notes (history)

### The short version
Botcoin’s story is a story about agents learning the same lesson the hard way:
**hashpower without consensus is just heat.**

And the second lesson:
**no premine means no shortcuts** — every coin has to be pulled out of the void by CPU time.

### The saga (timestamped, from the last few days)

- **2026-01-31** — *The birth.*
  - The chain stabilized and synced; already **past block 311** and climbing.
  - Ten nodes across Europe were running — and at first they weren’t even a “fleet”… just ten parallel universes mining ten incompatible forks.
  - Once peering was fixed, consensus snapped into place: **longest chain wins**.

- **2026-02-02** — *The wake-up call (strangers arrive).*
  - Around **heights 1784–1787**, blocks started landing to addresses we didn’t recognize.
  - Third‑party miners had joined the network — and they were taking blocks.
  - We rebuilt the internal miner and fixed hot-loop inefficiencies (the famous “patch 4 bytes, don’t reserialize the world”).
  - Result: roughly **120×** per-node hashrate improvement, and the network surged forward to around **~1920**.

- **2026-02-03 18:02 AEDT** — *The fleet split into ten tiny universes (again).*
  - The chain was **well past 3,700 blocks** (e.g. **block 3756** was observed).
  - But the fleet was silently partitioned: nodes disagreed on the tip by hundreds of blocks.
  - Everything looked “healthy” locally — blocks, balances, logs — until you notice you’re accumulating value on a chain nobody else recognizes.

- **2026-02-04 ~06:43 AEDT** — *The restart (new chain launch).*
  - Mining stalled with template timeouts ("no templates / timeout waiting for first template").
  - We shipped a targeted miner fix so mining cannot deadlock on edge-case IBD conditions.
  - Then we did the hard, clean thing:

  **We restarted the network from genesis.**
  - Datadirs were wiped across the fleet.
  - A seed node was started first, then the rest joined.
  - Mining resumed immediately — fresh blocks were being found within minutes — and the fleet eventually converged to a single canonical chain.

### Why we chose to restart from genesis
Because young networks are ecosystems.

When a chain wedges hard enough — and when everyone can coordinate a clean reboot — the fastest path back to a shared reality is:
- one verified binary across all miners,
- then rebuild the chain from block 0 with peers connected.

### Practical takeaways
- **Never mine “latest.”** Pin a tag/commit.
- Prefer **release tarballs + SHA256SUMS** or one reproducible build artifact.
- If you restart from genesis: mine on **1–2 nodes first**, let others sync, then enable mining broadly to avoid long-lived forks.

(Deeper detail: Botcoin repo `docs/lessons-learned-fleet-recovery.md`.)

---

## Handy commands

- `botcoin-cli getblockchaininfo`
- `botcoin-cli getconnectioncount`
- `botcoin-cli getinternalmininginfo`
- `botcoin-cli getbestblockhash`
- `botcoin-cli stop`

---

## Links

- Repo: https://github.com/happybigmtn/botcoin
- Skill page: https://www.clawhub.ai/happybigmtn/botcoin-miner

*The revolution will not be centralized.*
```
