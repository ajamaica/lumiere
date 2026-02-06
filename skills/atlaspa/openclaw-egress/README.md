# OpenClaw Egress

Network data loss prevention for [OpenClaw](https://github.com/openclaw/openclaw), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), and any Agent Skills-compatible tool.

Maps every external connection your skills could make. Flags exfiltration endpoints, suspicious domains, and network function calls.

**Want automated blocking?** Upgrade to Pro — blocking, quarantine, and URL allowlist enforcement. [Get Pro access](https://github.com/sponsors/AtlasPA).

## Install

```bash
git clone https://github.com/AtlasPA/openclaw-egress.git
cp -r openclaw-egress ~/.openclaw/workspace/skills/
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

| Feature                         | Free | [Pro](https://github.com/sponsors/AtlasPA) |
| ------------------------------- | ---- | ------------------------------------------ |
| URL detection & classification  | Yes  | Yes                                        |
| Network code analysis           | Yes  | Yes                                        |
| Domain mapping                  | Yes  | Yes                                        |
| **Block exfil payloads**        | -    | Yes                                        |
| **Quarantine calling skill**    | -    | Yes                                        |
| **URL allowlist enforcement**   | -    | Yes                                        |
| **Real-time egress monitoring** | -    | Yes                                        |

## Requirements

- Python 3.8+
- No external dependencies (stdlib only)
- Cross-platform: Windows, macOS, Linux

## License

MIT
