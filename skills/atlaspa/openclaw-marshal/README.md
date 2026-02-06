# OpenClaw Marshal

Free compliance and policy enforcement for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Define security policies for agent workspaces, audit installed skills against those policies, and generate audit-ready compliance reports.

**Want automated countermeasures?** Upgrade to Pro — hook-based blocking, auto-remediation, compliance templates, and team policy sharing. [Get Pro access](https://github.com/sponsors/AtlasPA).

## The Problem

Agent workspaces accumulate skills that execute commands, access the network, and handle sensitive data. Without a defined security policy, there is no way to verify whether installed skills comply with your requirements — or whether your workspace meets basic security hygiene standards.

Existing tools check individual concerns (secrets, permissions, integrity). Nothing ties them together into a unified compliance posture.

This skill solves that.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-marshal.git

# Copy to your workspace skills directory
cp -r openclaw-marshal ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Create a default security policy
python3 scripts/marshal.py policy --init

# Run a full compliance audit
python3 scripts/marshal.py audit

# Check a specific skill
python3 scripts/marshal.py check openclaw-warden

# Generate a formatted compliance report
python3 scripts/marshal.py report

# Quick status check
python3 scripts/marshal.py status
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Checks

### Command Safety

- Dangerous patterns: `eval()`, `exec()`, pipe-to-shell, `rm -rf /`, `chmod 777`
- Policy-blocked commands (customizable)
- Review-required commands: `sudo`, `docker`, `ssh`

### Network Policy

- Domain allow/blocklists
- Suspicious TLD patterns (`*.tk`, `*.ml`, `*.ga`)
- Hardcoded URLs checked against policy

### Data Handling

- Verifies secret scanner (openclaw-sentry) is installed
- Verifies PII scanning is configured
- Log retention policy awareness

### Workspace Hygiene

- `.gitignore` exists with recommended patterns
- Audit trail (openclaw-ledger) installed and initialized
- Skill signing (openclaw-signet) installed and configured

### Configuration Security

- Debug modes left enabled
- Verbose logging in production
- Debug print statements

## Policy File

Running `policy --init` creates `.marshal-policy.json` with sensible defaults:

```json
{
  "version": 1,
  "name": "default",
  "rules": {
    "commands": {
      "allow": ["git", "python3", "node", "npm", "pip"],
      "block": ["curl|bash", "wget -O-|sh", "rm -rf /", "chmod 777"],
      "review": ["sudo", "docker", "ssh"]
    },
    "network": {
      "allow_domains": ["github.com", "pypi.org", "npmjs.com"],
      "block_domains": ["pastebin.com", "transfer.sh", "ngrok.io"],
      "block_patterns": ["*.tk", "*.ml", "*.ga"]
    },
    "data_handling": {
      "pii_scan": true,
      "secret_scan": true,
      "log_retention_days": 90
    },
    "workspace": {
      "require_gitignore": true,
      "require_audit_trail": true,
      "require_skill_signing": true,
      "max_skill_risk_score": 50
    }
  }
}
```

Edit this file to customize rules for your workspace or organization.

## Compliance Scoring

Each audit produces a 0-100% score with a letter grade:

| Score   | Grade | Meaning          |
| ------- | ----- | ---------------- |
| 90-100% | A     | Fully compliant  |
| 75-89%  | B     | Minor issues     |
| 60-74%  | C     | Needs attention  |
| 40-59%  | D     | Significant gaps |
| 0-39%   | F     | Non-compliant    |

Deductions are weighted by severity: CRITICAL (25pts), HIGH (15pts), MEDIUM (8pts), LOW (3pts), INFO (1pt).

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 0    | Compliant                            |
| 1    | Review needed (medium/high findings) |
| 2    | Critical violations detected         |

## Free vs Pro

| Feature                              | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------------ | ---- | ------------------------------------------ |
| Policy definition                    | Yes  | Yes                                        |
| Compliance audit                     | Yes  | Yes                                        |
| Skill checking                       | Yes  | Yes                                        |
| Report generation                    | Yes  | Yes                                        |
| Active enforcement via hooks         | -    | Yes                                        |
| Command blocking                     | -    | Yes                                        |
| Auto-remediation                     | -    | Yes                                        |
| Heartbeat integration                | -    | Yes                                        |
| Policy templates (GDPR, HIPAA, SOC2) | -    | Yes                                        |
| Team policy sharing                  | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
