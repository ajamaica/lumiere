# OpenClaw Ledger

Tamper-evident audit trail for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Hash-chained logs of every workspace change. If anyone alters the record, the chain breaks and you know.

**Want automated countermeasures?** Upgrade to Pro — freeze compromised logs, forensic timeline, chain restoration, and session replay. [Get Pro access](https://github.com/sponsors/AtlasPA).

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-ledger.git
cp -r openclaw-ledger ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Initialize ledger
python3 scripts/ledger.py init

# Record current state
python3 scripts/ledger.py record
python3 scripts/ledger.py record -m "Installed new skill"

# Verify chain integrity
python3 scripts/ledger.py verify

# View recent entries
python3 scripts/ledger.py log
python3 scripts/ledger.py log -n 20

# Quick status
python3 scripts/ledger.py status
```

## How It Works

Every entry is hash-chained:

```
Entry 1: { timestamp, prev_hash: 0000...0000, event, data }
Entry 2: { timestamp, prev_hash: sha256(Entry 1), event, data }
Entry 3: { timestamp, prev_hash: sha256(Entry 2), event, data }
```

If any entry is modified, inserted, or deleted, the chain breaks and `verify` catches it.

## Free vs Pro

| Feature                     | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| --------------------------- | ---- | ------------------------------------------ |
| Hash-chained logging        | Yes  | Yes                                        |
| Chain verification          | Yes  | Yes                                        |
| Change tracking             | Yes  | Yes                                        |
| Log viewer                  | Yes  | Yes                                        |
| **Freeze compromised logs** | -    | Yes                                        |
| **Forensic timeline**       | -    | Yes                                        |
| **Chain restoration**       | -    | Yes                                        |
| **Session replay**          | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
