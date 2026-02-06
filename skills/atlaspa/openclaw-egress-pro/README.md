# OpenClaw Egress Pro

Full network data loss prevention suite for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Everything in [openclaw-egress](https://github.com/AtlasPA/openclaw-egress) (free) plus automated countermeasures: block network calls, quarantine compromised skills, and enforce domain allowlists.

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-egress-pro.git
cp -r openclaw-egress-pro ~/.openclaw/workspace/skills/
```

## Usage

```bash
# Full network scan
python3 scripts/egress.py scan

# Skills-only scan
python3 scripts/egress.py scan --skills-only

# List all external domains
python3 scripts/egress.py domains

# Quick status
python3 scripts/egress.py status

# Block network calls in a skill
python3 scripts/egress.py block <skill-name>

# Quarantine a compromised skill
python3 scripts/egress.py quarantine <skill-name>

# Restore a quarantined skill
python3 scripts/egress.py unquarantine <skill-name>

# Manage domain allowlist
python3 scripts/egress.py allowlist --show
python3 scripts/egress.py allowlist --add api.mycompany.com
python3 scripts/egress.py allowlist --remove api.mycompany.com

# Full automated protection sweep (recommended for session startup)
python3 scripts/egress.py protect
```

## What It Detects

- **Data exfiltration** — Base64/hex payloads in URL parameters
- **Sharing services** — Pastebin, transfer.sh, 0x0.st, file.io
- **Request catchers** — ngrok, requestbin, pipedream, beeceptor
- **Dynamic DNS** — duckdns, no-ip, dynu, freedns
- **URL shorteners** — bit.ly, tinyurl, t.co, goo.gl
- **IP endpoints** — Direct IP address connections
- **Suspicious TLDs** — .xyz, .tk, .ml, .ga, .cf, .top
- **Network code** — urllib, requests, httpx, aiohttp, curl, wget, fetch
- **Webhook callbacks** — /webhook, /callback, /hook, /beacon endpoints

## Free vs Pro

| Feature                           | [Free](https://github.com/AtlasPA/openclaw-egress) | Pro |
| --------------------------------- | -------------------------------------------------- | --- |
| URL detection & classification    | Yes                                                | Yes |
| Network code analysis             | Yes                                                | Yes |
| Domain mapping                    | Yes                                                | Yes |
| Custom domain allowlist           | -                                                  | Yes |
| **Block network calls**           | -                                                  | Yes |
| **Quarantine compromised skills** | -                                                  | Yes |
| **Unquarantine restored skills**  | -                                                  | Yes |
| **Automated protection sweep**    | -                                                  | Yes |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
