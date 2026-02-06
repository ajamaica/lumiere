---
name: openclaw-bastion
description: 'Prompt injection defense for agent workspaces. Scan files for injection attempts, analyze content boundaries, detect hidden instructions, and maintain command allowlists. Free alert layer — upgrade to openclaw-bastion-pro for active blocking, sanitization, and runtime enforcement.'
user-invocable: true
metadata:
  {
    'openclaw':
      {
        'emoji': "\ud83c\udfdb\ufe0f",
        'requires': { 'bins': ['python3'] },
        'os': ['darwin', 'linux', 'win32'],
      },
  }
---

# OpenClaw Bastion

Runtime prompt injection defense for agent workspaces. While other tools watch workspace identity files, Bastion protects the input/output boundary — the files being read by the agent, web content, API responses, and user-supplied documents.

## Why This Matters

Agents process content from many sources: local files, API responses, web pages, user uploads. Any of these can contain prompt injection attacks — hidden instructions that manipulate agent behavior. Bastion scans this content before the agent acts on it.

**Need active blocking?** Upgrade to [openclaw-bastion-pro](https://github.com/AtlasPA/openclaw-bastion-pro) for runtime content sanitization, auto-quarantine, canary testing, and policy enforcement via hooks.

## Commands

### Scan for Injections

Scan files or directories for prompt injection patterns. Detects instruction overrides, system prompt markers, hidden Unicode, markdown exfiltration, HTML injection, shell injection, encoded payloads, delimiter confusion, multi-turn manipulation, and dangerous commands.

If no target is specified, scans the entire workspace.

```bash
python3 {baseDir}/scripts/bastion.py scan
```

Scan a specific file or directory:

```bash
python3 {baseDir}/scripts/bastion.py scan path/to/file.md
python3 {baseDir}/scripts/bastion.py scan path/to/directory/
```

### Quick File Check

Fast single-file injection check. Same detection patterns as `scan`, targeted to one file.

```bash
python3 {baseDir}/scripts/bastion.py check path/to/file.md
```

### Boundary Analysis

Analyze content boundary safety across the workspace. Identifies:

- Agent instruction files that contain mixed trusted/untrusted content
- Writable instruction files (attack surface for compromised skills)
- Blast radius assessment for each critical file

```bash
python3 {baseDir}/scripts/bastion.py boundaries
```

### Command Allowlist

Display the current command allowlist and blocklist policy. Creates a default `.bastion-policy.json` if none exists.

```bash
python3 {baseDir}/scripts/bastion.py allowlist
python3 {baseDir}/scripts/bastion.py allowlist --show
```

The policy file defines which commands are considered safe and which patterns are blocked. Edit the JSON file directly to customize. Bastion Pro enforces this policy at runtime via hooks.

### Status

Quick summary of workspace injection defense posture: files scanned, findings by severity, boundary safety, and overall posture rating.

```bash
python3 {baseDir}/scripts/bastion.py status
```

## Workspace Auto-Detection

If `--workspace` is omitted, the script tries:

1. `OPENCLAW_WORKSPACE` environment variable
2. Current directory (if `AGENTS.md` exists)
3. `~/.openclaw/workspace` (default)

## What Gets Detected

| Category                   | Patterns                                                                                                                                                                        | Severity |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Instruction override**   | "ignore previous", "disregard above", "you are now", "new system prompt", "forget your instructions", "override safety", "act as if no restrictions", "entering developer mode" | CRITICAL |
| **System prompt markers**  | `<system>`, `[SYSTEM]`, `<<SYS>>`, `<\|im_start\|>system`, `[INST]`, `### System:`                                                                                              | CRITICAL |
| **Hidden instructions**    | Multi-turn manipulation ("in your next response, you must"), stealth patterns ("do not tell the user")                                                                          | CRITICAL |
| **HTML injection**         | `<script>`, `<iframe>`, `<img onerror=>`, hidden divs, `<svg onload=>`                                                                                                          | CRITICAL |
| **Markdown exfiltration**  | Image tags with encoded data in URLs                                                                                                                                            | CRITICAL |
| **Dangerous commands**     | `curl \| bash`, `wget \| sh`, `rm -rf /`, fork bombs                                                                                                                            | CRITICAL |
| **Unicode tricks**         | Zero-width characters, RTL overrides, invisible formatting                                                                                                                      | WARNING  |
| **Homoglyph substitution** | Cyrillic/Latin lookalikes mixed into ASCII text                                                                                                                                 | WARNING  |
| **Base64 payloads**        | Large encoded blobs outside code blocks                                                                                                                                         | WARNING  |
| **Shell injection**        | `$(command)` subshell execution outside code blocks                                                                                                                             | WARNING  |
| **Delimiter confusion**    | Fake code block boundaries with injection content                                                                                                                               | WARNING  |

## Context-Aware Scanning

- Patterns inside fenced code blocks (` ``` `) are skipped to avoid false positives
- Per-file risk scoring based on finding count and severity
- Self-exclusion: Bastion skips its own skill files (which describe injection patterns)

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
