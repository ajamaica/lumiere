# OpenClaw Arbiter

Permission auditor for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Reports exactly what system resources each installed skill accesses: network, subprocess, file I/O, environment variables, and unsafe operations like eval/pickle.

**Want automated enforcement?** Upgrade to Pro — revocation, quarantine, and policy enforcement. [Get Pro access](https://github.com/sponsors/AtlasPA).

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-arbiter.git
cp -r openclaw-arbiter ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Full audit of all skills
python3 scripts/arbiter.py audit

# Audit a specific skill
python3 scripts/arbiter.py audit openclaw-warden

# Permission matrix (compact table)
python3 scripts/arbiter.py report

# Quick status
python3 scripts/arbiter.py status
```

## What It Detects

| Category      | Risk     | Examples                           |
| ------------- | -------- | ---------------------------------- |
| Serialization | CRITICAL | pickle, eval(), exec(), **import** |
| Subprocess    | HIGH     | subprocess, os.system, Popen       |
| Network       | HIGH     | urllib, requests, curl, wget, URLs |
| File Write    | MEDIUM   | open('w'), shutil, os.remove       |
| Environment   | MEDIUM   | os.environ, os.getenv              |
| Crypto        | LOW      | hashlib, hmac, ssl                 |
| File Read     | LOW      | open('r'), os.walk, glob           |

## Free vs Pro

| Feature                               | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------------- | ---- | ------------------------------------------ |
| Permission detection                  | Yes  | Yes                                        |
| Permission matrix                     | Yes  | Yes                                        |
| Line-level findings                   | Yes  | Yes                                        |
| **Revoke excess permissions**         | -    | Yes                                        |
| **Quarantine over-privileged skills** | -    | Yes                                        |
| **Enforce permission policies**       | -    | Yes                                        |
| **Pre-install permission gate**       | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
