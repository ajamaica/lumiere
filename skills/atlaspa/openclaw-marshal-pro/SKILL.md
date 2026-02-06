---
name: openclaw-marshal-pro
description: 'Full compliance and policy enforcement suite: define security policies, audit compliance, auto-enforce violations, quarantine non-compliant skills, generate runtime hooks, and apply compliance templates. Everything in openclaw-marshal (free) plus automated enforcement.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '📋', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Marshal Pro

Full compliance and policy enforcement suite. Everything in openclaw-marshal (free) plus active enforcement: auto-quarantine non-compliant skills, generate runtime hooks, apply compliance templates, and run full automated protection sweeps.

Free = alert. Pro = subvert + quarantine + defend.

## Commands

### Initialize Policy

Create a default security policy file (`.marshal-policy.json`) with sensible defaults.

```bash
python3 {baseDir}/scripts/marshal.py policy --init --workspace /path/to/workspace
```

### Show Policy

Display the current active policy.

```bash
python3 {baseDir}/scripts/marshal.py policy --show --workspace /path/to/workspace
```

### Policy Summary

Quick overview of loaded policy rules.

```bash
python3 {baseDir}/scripts/marshal.py policy --workspace /path/to/workspace
```

### Full Compliance Audit

Audit all installed skills and workspace configuration against the active policy. Reports compliance score, violations, and recommendations.

```bash
python3 {baseDir}/scripts/marshal.py audit --workspace /path/to/workspace
```

### Check Specific Skill

Check a single skill against the policy. Reports pass/fail per rule with fix recommendations.

```bash
python3 {baseDir}/scripts/marshal.py check openclaw-warden --workspace /path/to/workspace
```

### Generate Compliance Report

Produce a formatted, copy-pastable compliance report suitable for audit documentation.

```bash
python3 {baseDir}/scripts/marshal.py report --workspace /path/to/workspace
```

### Quick Status

One-line summary: policy loaded, compliance score, critical violations count, quarantined skills.

```bash
python3 {baseDir}/scripts/marshal.py status --workspace /path/to/workspace
```

### Enforce (Pro)

Active policy enforcement: scan all skills, auto-quarantine those with CRITICAL violations, generate fix recommendations for MEDIUM violations.

```bash
python3 {baseDir}/scripts/marshal.py enforce --workspace /path/to/workspace
```

### Quarantine a Skill (Pro)

Quarantine a non-compliant skill by prefixing its directory with `.quarantined-`, making it invisible to all agent tools.

```bash
python3 {baseDir}/scripts/marshal.py quarantine bad-skill --workspace /path/to/workspace
```

### Unquarantine a Skill (Pro)

Restore a quarantined skill after investigation.

```bash
python3 {baseDir}/scripts/marshal.py unquarantine bad-skill --workspace /path/to/workspace
```

### Generate Runtime Hooks (Pro)

Generate Claude Code hook configurations that enforce policies at runtime. Creates PreToolUse hooks for Bash (command allowlist/blocklist) and Write (PII pattern scanning).

```bash
python3 {baseDir}/scripts/marshal.py hooks --workspace /path/to/workspace
```

### Compliance Templates (Pro)

List or apply pre-built compliance templates: general (balanced), enterprise (strict), minimal (basic).

```bash
# List available templates
python3 {baseDir}/scripts/marshal.py templates --list --workspace /path/to/workspace

# Apply a template
python3 {baseDir}/scripts/marshal.py templates --apply enterprise --workspace /path/to/workspace
```

### Full Protection Sweep (Pro)

Automated sweep recommended for session startup: load policy, audit all skills, enforce violations, quarantine critical violators, generate summary report.

```bash
python3 {baseDir}/scripts/marshal.py protect --workspace /path/to/workspace
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if AGENTS.md exists)
3. `~/.openclaw/workspace` (default)

## What Gets Checked

| Category              | Checks                                                   | Severity      |
| --------------------- | -------------------------------------------------------- | ------------- |
| **Command Safety**    | Dangerous patterns (eval, exec, pipe-to-shell, rm -rf /) | CRITICAL      |
| **Command Policy**    | Blocked and review-required commands from policy         | HIGH/MEDIUM   |
| **Network Policy**    | Domain allow/blocklists, suspicious TLD patterns         | CRITICAL/HIGH |
| **Data Handling**     | Secret scanner installed, PII scanner configured         | HIGH/MEDIUM   |
| **Workspace Hygiene** | .gitignore, audit trail (ledger), skill signing (signet) | HIGH/MEDIUM   |
| **Configuration**     | Debug modes, verbose logging left enabled                | LOW           |

## Policy Format

The `.marshal-policy.json` file defines all rules:

- **commands.allow** — Permitted binaries
- **commands.block** — Blocked command patterns
- **commands.review** — Commands requiring human review
- **network.allow_domains** — Permitted network domains
- **network.block_domains** — Blocked domains
- **network.block_patterns** — Wildcard domain blocks (e.g., `*.tk`)
- **data_handling.pii_scan** — Require PII scanning
- **data_handling.secret_scan** — Require secret scanning
- **workspace.require_gitignore** — Require .gitignore
- **workspace.require_audit_trail** — Require ledger
- **workspace.require_skill_signing** — Require signet

## Exit Codes

- `0` — Compliant, no issues
- `1` — Review needed (medium/high findings)
- `2` — Critical violations detected

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
