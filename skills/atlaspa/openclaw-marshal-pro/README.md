# OpenClaw Marshal Pro

Full compliance and policy enforcement suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-marshal](https://github.com/AtlasPA/openclaw-marshal) (free) **plus automated enforcement**: auto-quarantine non-compliant skills, generate runtime hooks, apply compliance templates, and run full protection sweeps.

## Free Version Alerts. Pro Version Defends.

| Feature                                                 | Free | Pro     |
| ------------------------------------------------------- | ---- | ------- |
| Policy definition                                       | Yes  | Yes     |
| Compliance audit                                        | Yes  | Yes     |
| Skill checking                                          | Yes  | Yes     |
| Report generation                                       | Yes  | Yes     |
| Quick status                                            | Yes  | Yes     |
| **Active enforcement (auto-quarantine)**                | -    | **Yes** |
| **Manual quarantine/unquarantine**                      | -    | **Yes** |
| **Runtime hook generation**                             | -    | **Yes** |
| **Compliance templates (general, enterprise, minimal)** | -    | **Yes** |
| **Full protection sweep**                               | -    | **Yes** |
| **Fix recommendations**                                 | -    | **Yes** |
| **Enforcement audit log**                               | -    | **Yes** |

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-marshal-pro.git

# Copy to your workspace skills directory
cp -r openclaw-marshal-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# --- Free features (included) ---

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

# --- Pro features ---

# AUTO-ENFORCE: quarantine critical violators, recommend fixes
python3 scripts/marshal.py enforce

# Quarantine a non-compliant skill
python3 scripts/marshal.py quarantine bad-skill

# Restore a quarantined skill after investigation
python3 scripts/marshal.py unquarantine bad-skill

# Generate Claude Code runtime hooks (Bash blocklist, PII scanning)
python3 scripts/marshal.py hooks

# List compliance templates
python3 scripts/marshal.py templates --list

# Apply an enterprise compliance template
python3 scripts/marshal.py templates --apply enterprise

# FULL PROTECTION SWEEP (recommended for session startup)
python3 scripts/marshal.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## Pro Features in Detail

### Enforce

Scans all installed skills against the active policy. Skills with CRITICAL violations are automatically quarantined (directory prefixed with `.quarantined-`). Skills with MEDIUM violations receive fix recommendations. All enforcement actions are logged to `.marshal/enforcement.log.json`.

### Quarantine / Unquarantine

Quarantine disables a skill by renaming its directory, making it invisible to all agent tools. Unquarantine restores it. Both actions are logged.

### Runtime Hooks

Generates Claude Code hook configurations for `.claude/settings.json`:

- **PreToolUse (Bash)**: Checks commands against the policy blocklist and review list before execution.
- **PreToolUse (Write)**: Scans output content for PII patterns (SSN, email, credit card, phone) before writing.

### Compliance Templates

Three pre-built templates for common compliance postures:

| Template     | Description                                               |
| ------------ | --------------------------------------------------------- |
| `general`    | Balanced policy suitable for most workspaces              |
| `enterprise` | Strict policy requiring all security tools installed      |
| `minimal`    | Lightweight policy covering critical security checks only |

Applying a template backs up the existing policy before overwriting.

### Protect

One-command full protection sweep recommended for session startup:

1. Load (or initialize) security policy
2. Audit all installed skills
3. Auto-quarantine critical violators
4. Check workspace-level compliance
5. Generate summary report

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

Edit this file to customize rules, or use `templates --apply` to start from a pre-built posture.

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

## Session Startup Integration

### Claude Code (hooks)

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 path/to/skills/openclaw-marshal-pro/scripts/marshal.py protect",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### OpenClaw (heartbeat)

Add to HEARTBEAT.md:

```
- Run workspace compliance protection
```

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
