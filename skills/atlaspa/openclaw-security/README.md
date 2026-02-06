# OpenClaw Security Suite

One skill to rule them all. Installs, configures, and orchestrates the complete OpenClaw security stack for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

**11 security tools. 1 command.**

## The Problem

Agent workspace security requires multiple layers: integrity monitoring, secret scanning, permission auditing, network DLP, supply chain analysis, credential protection, injection defense, compliance enforcement, audit trails, skill verification, and incident response.

Setting up and running 11 separate tools is tedious. This skill installs them all, initializes them, and provides a unified dashboard and scan pipeline.

## Install

```bash
# Install the orchestrator
git clone https://github.com/AtlasPA/openclaw-security.git
cp -r openclaw-security ~/.openclaw/workspace/skills/

# Install all 11 security tools
python3 scripts/security.py install

# Initialize everything
python3 scripts/security.py setup

# Check workspace health
python3 scripts/security.py status
```

## Commands

| Command   | What it does                                                      |
| --------- | ----------------------------------------------------------------- |
| `install` | Install all 11 free security skills from ClawHub                  |
| `setup`   | Initialize tools that need it (baseline, signing, ledger, policy) |
| `status`  | Unified dashboard — health check across all tools                 |
| `scan`    | Full security scan — runs every scanner in logical order          |
| `list`    | Show which tools are installed (free/pro)                         |
| `update`  | Update all installed skills to latest versions                    |
| `protect` | Run Pro countermeasures across all tools (requires Pro)           |

All commands accept `--workspace /path` or `-w /path`. Auto-detects from `$OPENCLAW_WORKSPACE` or `~/.openclaw/workspace`.

## Scan Pipeline Order

The `scan` command runs tools in a logical security sequence:

1. **Sentinel** — Are installed skills safe? (supply chain)
2. **Signet** — Have skills been tampered? (signing verification)
3. **Warden** — Have workspace files changed? (integrity)
4. **Bastion** — Are there injection patterns? (prompt injection)
5. **Sentry** — Are secrets exposed? (credential scanning)
6. **Vault** — Are credentials properly protected? (lifecycle)
7. **Arbiter** — Do skills have excess permissions? (permission audit)
8. **Egress** — Are there exfiltration risks? (network DLP)
9. **Marshal** — Does everything meet policy? (compliance)
10. **Ledger** — Is the audit trail intact? (chain verification)
11. **Triage** — Any active incidents? (forensics)

## What Gets Installed

| Tool                                                     | Domain               | Free Features                            |
| -------------------------------------------------------- | -------------------- | ---------------------------------------- |
| [warden](https://github.com/AtlasPA/openclaw-warden)     | Workspace integrity  | Baseline checksums, injection scanning   |
| [sentry](https://github.com/AtlasPA/openclaw-sentry)     | Secret scanning      | 25+ secret patterns, file scanning       |
| [arbiter](https://github.com/AtlasPA/openclaw-arbiter)   | Permission auditing  | 7 permission categories, risk scoring    |
| [signet](https://github.com/AtlasPA/openclaw-signet)     | Skill signing        | SHA-256 manifests, tamper detection      |
| [ledger](https://github.com/AtlasPA/openclaw-ledger)     | Audit trail          | Hash-chained JSONL logs                  |
| [egress](https://github.com/AtlasPA/openclaw-egress)     | Network DLP          | URL detection, exfil pattern matching    |
| [sentinel](https://github.com/AtlasPA/openclaw-sentinel) | Supply chain         | Obfuscation detection, risk scoring      |
| [vault](https://github.com/AtlasPA/openclaw-vault)       | Credential lifecycle | Exposure auditing, permission checks     |
| [bastion](https://github.com/AtlasPA/openclaw-bastion)   | Injection defense    | Pattern scanning, boundary analysis      |
| [marshal](https://github.com/AtlasPA/openclaw-marshal)   | Compliance           | Policy enforcement, command restrictions |
| [triage](https://github.com/AtlasPA/openclaw-triage)     | Incident response    | Investigation, timeline, evidence        |

## Pro Upgrade

Free tools detect threats. Pro tools respond to them.

[Become a sponsor](https://github.com/sponsors/AtlasPA) to unlock automated countermeasures: restore, quarantine, rollback, blocking, remediation, and protection sweeps across all 11 tools.

## Requirements

- Python 3.8+
- ClawHub CLI (`npm install -g clawhub`) for install/update commands
- No other external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
