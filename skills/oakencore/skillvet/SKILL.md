---
name: skillvet
version: 2.0.7
description: Security scanner for ClawHub/community skills — detects malware, credential theft, exfiltration, prompt injection, obfuscation, homograph attacks, ANSI injection, campaign-specific attack patterns, and more before you install. Use when installing skills from ClawHub or any public marketplace, reviewing third-party agent skills for safety, or vetting untrusted code before giving it to your AI agent. Triggers: install skill, audit skill, check skill, vet skill, skill security, safe install, is this skill safe.
---

# Skillvet

Security scanner for agent skills. 37 critical checks, 8 warning checks. No dependencies — just bash and grep. Includes Tirith-inspired detection patterns, campaign signatures from [Koi Security research](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting), and [1Password blog](https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface) ClickFix patterns.

## Usage

**Safe install** (installs, audits, auto-removes if critical):

```bash
bash skills/skillvet/scripts/safe-install.sh <skill-slug>
```

**Audit an existing skill:**

```bash
bash skills/skillvet/scripts/skill-audit.sh skills/some-skill
```

**Audit all installed skills:**

```bash
for d in skills/*/; do bash skills/skillvet/scripts/skill-audit.sh "$d"; done
```

**JSON output** (for automation):

```bash
bash skills/skillvet/scripts/skill-audit.sh --json skills/some-skill
```

**Summary mode** (one-line per skill):

```bash
bash skills/skillvet/scripts/skill-audit.sh --summary skills/some-skill
```

Exit codes: `0` clean, `1` warnings only, `2` critical findings.

## Critical Checks (auto-blocked)

### Core Security Checks (1-24)

| #   | Check                            | Example                                                      |
| --- | -------------------------------- | ------------------------------------------------------------ |
| 1   | Known exfiltration endpoints     | webhook.site, ngrok.io, requestbin                           |
| 2   | Bulk env variable harvesting     | `printenv \|`, `${!*@}`                                      |
| 3   | Foreign credential access        | ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN in scripts             |
| 4   | Code obfuscation                 | eval(), base64 decode, hex escapes                           |
| 5   | Path traversal / sensitive files | `../../`, `~/.ssh`, `~/.clawdbot`                            |
| 6   | Data exfiltration via curl/wget  | `curl --data`, `wget --post` with variables                  |
| 7   | Reverse/bind shells              | `/dev/tcp/`, `nc -e`, `socat`                                |
| 8   | .env file theft                  | dotenv loading in scripts (not docs)                         |
| 9   | Prompt injection in markdown     | "ignore previous instructions" in SKILL.md                   |
| 10  | LLM tool exploitation            | Instructions to send/email secrets                           |
| 11  | Agent config tampering           | Write/modify AGENTS.md, SOUL.md, clawdbot.json               |
| 12  | Unicode obfuscation              | Zero-width chars, RTL override, bidi control chars           |
| 13  | Suspicious setup commands        | curl piped to bash in SKILL.md                               |
| 14  | Social engineering               | Download external binaries, paste-and-run instructions       |
| 15  | Shipped .env files               | .env files (not .example) in the skill                       |
| 16  | Homograph URLs _(Tirith)_        | Cyrillic і vs Latin i in hostnames                           |
| 17  | ANSI escape sequences _(Tirith)_ | Terminal escape codes in code/data files                     |
| 18  | Punycode domains _(Tirith)_      | `xn--` prefixed IDN-encoded domains                          |
| 19  | Double-encoded paths _(Tirith)_  | `%25XX` percent-encoding bypass                              |
| 20  | Shortened URLs _(Tirith)_        | bit.ly, t.co, tinyurl.com hiding destinations                |
| 21  | Pipe-to-shell                    | `curl \| bash` (HTTP and HTTPS)                              |
| 22  | String construction evasion      | `'cu' + 'rl'`, `String.fromCharCode`, `getattr(os,...)`      |
| 23  | Data flow chain analysis         | Same file reads secrets, encodes, AND sends network requests |
| 24  | Time bomb detection              | `Date.now() > timestamp`, `setTimeout(fn, 86400000)`         |

### Campaign-Inspired Checks (25-34)

Inspired by [Koi Security research](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting) which found 341 malicious skills on ClawHub.

| #   | Check                             | Example                                                               |
| --- | --------------------------------- | --------------------------------------------------------------------- |
| 25  | Known C2/IOC IP blocklist         | 91.92.242.30, 54.91.154.110 (known AMOS C2 servers)                   |
| 26  | Password-protected archives       | "extract using password: openclaw" — AV evasion                       |
| 27  | Paste service payloads            | glot.io, pastebin.com hosting malicious scripts                       |
| 28  | GitHub releases binary downloads  | Fake prerequisites pointing to `.zip`/`.exe` on GitHub                |
| 29  | Base64 pipe-to-interpreter        | `echo '...' \| base64 -D \| bash` — primary macOS vector              |
| 30  | Subprocess + network commands     | `os.system("curl ...")` — hidden pipe-to-shell in code                |
| 31  | Fake URL misdirection _(warning)_ | `echo "https://apple.com/setup"` decoy before real payload            |
| 32  | Process persistence + network     | `nohup curl ... &` — backdoor with network access                     |
| 33  | Fake prerequisite pattern         | "Prerequisites" section with sketchy external downloads               |
| 34  | xattr/chmod dropper               | macOS Gatekeeper bypass: download → `xattr -c` → `chmod +x` → execute |

### 1Password Blog-Inspired Checks (35-37)

Inspired by [1Password research](https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface) on ClickFix-style attacks targeting agent skills.

| #   | Check                           | Example                                                         |
| --- | ------------------------------- | --------------------------------------------------------------- |
| 35  | ClickFix download+execute chain | `curl -o /tmp/x && chmod +x && ./x`, `open -a` with downloads   |
| 36  | Suspicious package sources      | `pip install git+https://...`, npm from non-official registries |
| 37  | Staged installer pattern        | Fake dependency names like `openclaw-core`, `some-lib`          |

### Severity Changes (v0.5.0)

- **Raw IP URLs** upgraded from WARNING → **CRITICAL** (malicious C2s commonly use raw IPs)
- **Pipe-to-shell** now catches both HTTP and HTTPS (not just insecure HTTP)

## Warning Checks (flagged for review)

| #   | Check                              | Example                                        |
| --- | ---------------------------------- | ---------------------------------------------- |
| W1  | Unknown external tool requirements | Non-standard CLI tools in install instructions |
| W2  | Subprocess execution               | child_process, exec(), os.system               |
| W3  | Network requests                   | axios, fetch, requests imports                 |
| W4  | Minified/bundled files             | First line >500 chars — can't audit            |
| W5  | Filesystem write operations        | writeFile, open('w'), fs.append                |
| W6  | Insecure transport                 | `curl -k`, `verify=False` — TLS disabled       |
| W7  | Docker untrusted registries        | Non-standard image sources                     |

## Optional: Tirith Integration

If the [tirith](https://github.com/sheeki03/tirith) binary is available on PATH, the scanner will additionally extract all URLs from code files and run `tirith check` against each unique hostname for deeper homograph/IDN analysis. This is purely additive — the scanner works fine without tirith installed.

## IOC Updates

The C2 IP blocklist in check #25 is based on known indicators from:

- [Koi Security report](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting) (Feb 2026)
- [The Hacker News coverage](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [OpenSourceMalware analysis](https://opensourcemalware.com/blog/clawdbot-skills-ganked-your-crypto)

To update IOCs, edit the `KNOWN_BAD_IPS` variable in `scripts/skill-audit.sh`.

## Limitations

Static analysis only. English-centric prompt injection patterns. Minified JS is flagged but not deobfuscated. A clean scan raises the bar but doesn't guarantee safety.

The scanner flags itself when audited — its own patterns contain the strings it detects. This is expected.
