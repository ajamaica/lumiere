# OpenClaw Ledger Pro

Full audit trail suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-ledger](https://github.com/AtlasPA/openclaw-ledger) (free) plus automated countermeasures: freeze compromised chains, forensic timeline analysis, chain restoration from frozen backups, structured export, and full protection sweeps.

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-ledger-pro.git
cp -r openclaw-ledger-pro ~/.openclaw/workspace/skills/
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

# --- Pro commands ---

# Freeze chain (create read-only backup)
python3 scripts/ledger.py freeze

# Forensic analysis (timeline, anomalies, session boundaries)
python3 scripts/ledger.py forensics
python3 scripts/ledger.py forensics --from 2025-01-01 --to 2025-01-31

# Restore chain from frozen backup
python3 scripts/ledger.py restore
python3 scripts/ledger.py restore --from-frozen 20250115T120000Z

# Export chain for external analysis
python3 scripts/ledger.py export --format json
python3 scripts/ledger.py export --format text

# Full protection sweep (verify + auto-freeze + record)
python3 scripts/ledger.py protect
```

## How It Works

Every entry is hash-chained:

```
Entry 1: { timestamp, prev_hash: 0000...0000, event, data }
Entry 2: { timestamp, prev_hash: sha256(Entry 1), event, data }
Entry 3: { timestamp, prev_hash: sha256(Entry 2), event, data }
```

If any entry is modified, inserted, or deleted, the chain breaks and `verify` catches it. The `protect` command automates the full response: detect, preserve evidence, restore, and record.

## Free vs Pro

| Feature                           | [Free](https://github.com/AtlasPA/openclaw-ledger) | Pro |
| --------------------------------- | -------------------------------------------------- | --- |
| Hash-chained logging              | Yes                                                | Yes |
| Chain verification                | Yes                                                | Yes |
| Change tracking                   | Yes                                                | Yes |
| Log viewer                        | Yes                                                | Yes |
| **Freeze compromised chains**     | -                                                  | Yes |
| **Forensic timeline analysis**    | -                                                  | Yes |
| **Chain restoration**             | -                                                  | Yes |
| **Structured export (JSON/text)** | -                                                  | Yes |
| **Automated protection sweep**    | -                                                  | Yes |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
