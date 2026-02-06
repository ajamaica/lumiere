---
name: skill-scanner
description: Scan OpenBot/Clawdbot skills for security vulnerabilities, malicious code, and suspicious patterns before installing them. Use when a user wants to audit a skill, check if a ClawHub skill is safe, scan for credential exfiltration, detect prompt injection, or review skill security. Triggers on security audit, skill safety check, malware scan, or trust verification.
---

# Skill Security Scanner

Scan skills for malicious patterns before installation. Detects credential exfiltration, suspicious network calls, obfuscated code, prompt injection, and other red flags.

## Quick Start

```bash
# Scan a local skill folder
python3 scripts/scan.py /path/to/skill

# Verbose output (show matched lines)
python3 scripts/scan.py /path/to/skill --verbose

# JSON output (for automation)
python3 scripts/scan.py /path/to/skill --json
```

## Workflow: Scan Before Install

1. Download or locate the skill folder
2. Run `python3 scripts/scan.py <skill-path> --verbose`
3. Review findings by severity (CRITICAL/HIGH = do not install)
4. Report results to user with recommendation

## Score Interpretation

| Score      | Meaning                    | Recommendation                                |
| ---------- | -------------------------- | --------------------------------------------- |
| CLEAN      | No issues found            | Safe to install                               |
| INFO       | Minor notes only           | Safe to install                               |
| REVIEW     | Medium-severity findings   | Review manually before installing             |
| SUSPICIOUS | High-severity findings     | Do NOT install without thorough manual review |
| DANGEROUS  | Critical findings detected | Do NOT install — likely malicious             |

## Exit Codes

- `0` = CLEAN/INFO
- `1` = REVIEW
- `2` = SUSPICIOUS
- `3` = DANGEROUS

## Rules Reference

See `references/rules.md` for full list of detection rules, severity levels, and whitelisted domains.

## Limitations

- Pattern-based detection — cannot catch all obfuscation techniques
- No runtime analysis — only static scanning
- False positives possible for legitimate tools that access network/files
- Always combine with manual review for HIGH/MEDIUM findings
