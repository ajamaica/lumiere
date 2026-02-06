# OpenClaw Sentinel

Supply chain security for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Scans installed skills for obfuscated code, known-bad signatures, suspicious install behaviors, dependency confusion, and metadata inconsistencies — before and after installation.

**Want automated countermeasures?** Upgrade to Pro — auto-quarantine, pre-install blocking, community threat feed sync, SBOM generation, and continuous monitoring. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

You install skills from the community and trust them to run in your workspace. Any skill can contain obfuscated payloads, post-install hooks that execute arbitrary code, or supply chain attacks that silently modify other skills. Existing security tools verify file integrity after the fact — nothing inspects skills for supply chain risks before they run.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-sentinel.git

# Copy to your workspace skills directory
cp -r openclaw-sentinel ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Scan all installed skills for supply chain risks
python3 scripts/sentinel.py scan

# Scan a specific skill
python3 scripts/sentinel.py scan openclaw-warden

# Pre-install inspection (before copying to workspace)
python3 scripts/sentinel.py inspect /path/to/downloaded-skill

# View threat database stats
python3 scripts/sentinel.py threats

# Import community threat list
python3 scripts/sentinel.py threats --update-from community-threats.json

# Quick status
python3 scripts/sentinel.py status
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Detects

- **Encoded Execution** — eval(base64.b64decode(...)), exec(compile(...)), eval/exec with encoded strings
- **Dynamic Imports** — \_\_import\_\_('os').system(...), dynamic subprocess/ctypes imports
- **Shell Injection** — subprocess with shell=True + string concatenation, os.system()
- **Remote Code Execution** — urllib/requests combined with exec/eval (download-and-run)
- **Obfuscation** — Lines over 1000 chars, high-entropy strings, minified code blocks
- **Install Behaviors** — Post-install hooks, auto-exec in \_\_init\_\_.py, cross-skill file writes
- **Hidden Files** — Non-standard dotfiles and hidden directories
- **Dependency Confusion** — Skills shadowing popular package names, typosquatting near-matches
- **Metadata Mismatch** — Undeclared binaries, undeclared env vars, invocable flag inconsistencies
- **Serialization Attacks** — pickle.loads, marshal.loads (arbitrary code via deserialization)
- **Known-Bad Hashes** — File SHA-256 matches against a local threat database

## Free vs Pro

| Feature                                     | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------------------- | ---- | ------------------------------------------ |
| Deep supply chain scanning                  | Yes  | Yes                                        |
| Pre-install inspection (SAFE/REVIEW/REJECT) | Yes  | Yes                                        |
| Local threat database                       | Yes  | Yes                                        |
| Risk scoring (0-100 per skill)              | Yes  | Yes                                        |
| Obfuscation detection                       | Yes  | Yes                                        |
| Dependency confusion detection              | Yes  | Yes                                        |
| Metadata inconsistency checks               | Yes  | Yes                                        |
| **Auto-quarantine risky skills**            | -    | Yes                                        |
| **Community threat feed sync**              | -    | Yes                                        |
| **SBOM generation**                         | -    | Yes                                        |
| **Continuous monitoring**                   | -    | Yes                                        |
| **Pre-install blocking**                    | -    | Yes                                        |

## Exit Codes

| Code | Meaning          |
| ---- | ---------------- |
| 0    | Clean            |
| 1    | Review needed    |
| 2    | Threats detected |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
