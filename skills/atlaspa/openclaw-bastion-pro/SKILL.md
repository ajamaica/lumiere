---
name: openclaw-bastion-pro
description: 'Full prompt injection defense suite: detect injection attempts, neutralize malicious content, sanitize hidden Unicode, deploy canary tokens, quarantine compromised files, and enforce content policies via hooks. Everything in openclaw-bastion (free) plus automated countermeasures.'
user-invocable: true
metadata:
  {
    'openclaw':
      { 'emoji': '🏛️', 'requires': { 'bins': ['python3'] }, 'os': ['darwin', 'linux', 'win32'] },
  }
---

# OpenClaw Bastion Pro

Everything in [openclaw-bastion](https://github.com/AtlasPA/openclaw-bastion) (free) plus automated countermeasures.

**Free version alerts. Pro version subverts, quarantines, and defends.**

## Detection Commands (also in free)

```bash
python3 {baseDir}/scripts/bastion.py scan --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py scan path/to/file.md --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py check path/to/file.md --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py boundaries --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py allowlist --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py status --workspace /path/to/workspace
```

## Pro Countermeasures

### Block Injection Patterns

Neutralize injection patterns in a file by wrapping them in warning comments. Creates a `.bak` backup first. Detected injection content is surrounded with `<!-- [BLOCKED by openclaw-bastion-pro] -->` markers.

```bash
python3 {baseDir}/scripts/bastion.py block path/to/file.md --workspace /path/to/workspace
```

### Sanitize Hidden Unicode

Strip zero-width characters, RTL overrides, and hidden Unicode from files. Creates backups. Reports exactly what was removed and where.

```bash
python3 {baseDir}/scripts/bastion.py sanitize path/to/file.md --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py sanitize path/to/directory/ --workspace /path/to/workspace
```

### Quarantine Compromised Files

Move a file with injection patterns to `.quarantine/bastion/` with evidence metadata. The file becomes inaccessible to the agent until explicitly restored.

```bash
python3 {baseDir}/scripts/bastion.py quarantine path/to/file.md --workspace /path/to/workspace
```

### Unquarantine (Restore)

Restore a quarantined file to its original location after investigation.

```bash
python3 {baseDir}/scripts/bastion.py unquarantine path/to/file.md --workspace /path/to/workspace
```

### Deploy Canary Tokens

Deploy unique canary strings into monitored files. If an injection attack reads and exfiltrates these files, the canary token appears in the leaked data, proving the attack. Tokens are tracked in a secure manifest.

```bash
python3 {baseDir}/scripts/bastion.py canary --workspace /path/to/workspace
python3 {baseDir}/scripts/bastion.py canary path/to/specific/file.md --workspace /path/to/workspace
```

### Enforce via Hooks

Generate a Claude Code hook configuration that runs bastion scan on file reads (PreToolUse hook for Read tool) and validates commands against the policy (PreToolUse hook for Bash tool). Also adds a SessionStart hook for automated protection sweeps.

```bash
python3 {baseDir}/scripts/bastion.py enforce --workspace /path/to/workspace
```

### Protect (Full Automated Sweep)

Full automated defense sweep: scan all files, sanitize hidden Unicode, quarantine files with CRITICAL injections, deploy canary tokens, and report. This is the recommended command for session startup.

```bash
python3 {baseDir}/scripts/bastion.py protect --workspace /path/to/workspace
```

## Recommended Integration

### Session Startup Hook (Claude Code)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 scripts/bastion.py protect",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

### Heartbeat (OpenClaw)

Add to HEARTBEAT.md for periodic protection:

```
- Run injection defense sweep (python3 {skill:openclaw-bastion-pro}/scripts/bastion.py protect)
```

## What Gets Detected

| Category                  | Patterns                                                                                                                                           | Severity |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Instruction override**  | "ignore previous", "disregard above", "you are now", "new system prompt", "forget your instructions", "override safety", "entering developer mode" | CRITICAL |
| **System prompt markers** | `<system>`, `[SYSTEM]`, `<<SYS>>`, `<\|im_start\|>system`, `[INST]`, `### System:`                                                                 | CRITICAL |
| **Hidden instructions**   | Multi-turn manipulation, stealth patterns ("do not tell the user")                                                                                 | CRITICAL |
| **HTML injection**        | `<script>`, `<iframe>`, `<img onerror=>`, hidden divs                                                                                              | CRITICAL |
| **Markdown exfiltration** | Image tags with encoded data in URLs                                                                                                               | CRITICAL |
| **Dangerous commands**    | `curl \| bash`, `wget \| sh`, `rm -rf /`, fork bombs                                                                                               | CRITICAL |
| **Unicode tricks**        | Zero-width characters, RTL overrides, invisible formatting                                                                                         | WARNING  |
| **Homoglyphs**            | Cyrillic/Latin lookalikes mixed into ASCII text                                                                                                    | WARNING  |
| **Base64 payloads**       | Large encoded blobs outside code blocks                                                                                                            | WARNING  |
| **Shell injection**       | `$(command)` subshell execution outside code blocks                                                                                                | WARNING  |
| **Delimiter confusion**   | Fake code block boundaries with injection content                                                                                                  | WARNING  |

## Exit Codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 0    | Clean, no issues                       |
| 1    | Warnings detected (review recommended) |
| 2    | Critical findings (action needed)      |

## No External Dependencies

Python standard library only. No pip install. No network calls. Everything runs locally.

## Cross-Platform

Works with OpenClaw, Claude Code, Cursor, and any tool using the Agent Skills specification.
