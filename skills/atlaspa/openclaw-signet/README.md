# OpenClaw Signet

Cryptographic skill verification for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Sign installed skills with SHA-256 content hashes. Verify they haven't been tampered with. Detect exactly which files changed.

**Want automated countermeasures?** Upgrade to Pro — reject unsigned skills, quarantine tampered skills, restore from trusted state, and pre-install verification. [Get Pro access](https://github.com/sponsors/AtlasPA).

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-signet.git
cp -r openclaw-signet ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Sign all installed skills
python3 scripts/signet.py sign

# Sign a specific skill
python3 scripts/signet.py sign openclaw-warden

# Verify all skills
python3 scripts/signet.py verify

# List signed skills
python3 scripts/signet.py list

# Quick status
python3 scripts/signet.py status
```

## How It Works

```
sign:   Compute SHA-256 of every file → composite hash → store in manifest
verify: Recompute hashes → compare to manifest → report differences
```

If any file within a skill is modified, added, or removed, the composite hash changes and `verify` reports exactly what changed.

## Free vs Pro

| Feature                        | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------ | ---- | ------------------------------------------ |
| SHA-256 skill signing          | Yes  | Yes                                        |
| Tamper detection               | Yes  | Yes                                        |
| File-level change report       | Yes  | Yes                                        |
| Trust manifest                 | Yes  | Yes                                        |
| **Reject unsigned skills**     | -    | Yes                                        |
| **Quarantine tampered skills** | -    | Yes                                        |
| **Restore from trusted state** | -    | Yes                                        |
| **Pre-install verification**   | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
