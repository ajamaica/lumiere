# privatedeepsearch-claw

> [!IMPORTANT]  
> **🚨 VPN REQUIRED** - This tool MUST be used with VPN to be hidden. Without VPN, you're exposing your real IP to search engines.

**Don't let Big Tech know what you and your open claw are up to.**
Multi-iteration deep research that helps keep your claws private. Multi-iteration deep research that helps keep your claws private.

Powered by [SearXNG](https://github.com/searxng/searxng). **VPN REQUIRED for privacy.** No Google. No tracking. No API keys. No BS.

---

## What private deep claw Does

### 🔍 It Searches (Privately)

```bash
searx "best password managers 2026" 5
```

Don't let Big Tech know what you and your open claw are up to. Multi-iteration deep research that helps keep your claws private.

### 🔬 It Researches (Deeply)

```bash
deep-research "zero knowledge proofs practical applications"
```

Don't let Big Tech know what you and your open claw are up to. Multi-iteration deep research that helps keep your claws private.

### 🧿 Don't Let Big Tech Know What You and Your Open Claw Are Up To

| What Big Tech Does      | What Open Claw Does  |
| ----------------------- | -------------------- |
| Logs every search       | Logs nothing         |
| Builds a profile on you | Forgets you exist    |
| Sells your data         | Has no data to sell  |
| Runs on their servers   | Runs on YOUR machine |
| Costs $20/month         | Costs $0/forever     |

**Don't let Big Tech know what you and your open claw are up to**

---

## 🎯 WHAT YOU GET vs WHAT YOU DON'T

**⚠️ VPN REQUIREMENT:** This tool REQUIRES VPN to be hidden. Without VPN, you're still exposing your IP to search engines.

**✅ CAPABILITIES (What You're Getting):**
• Local SearXNG → Zero latency, no external calls  
• VPN-routed → REQUIRED for privacy (Mullvad/Tailscale support)
• No rate limits → Unlimited vs Google APIs
• Parallel processing → Multi-engine queries
• 5-iteration search → Recursive refinement
• Full content scraping → Not just snippets
• 40+ privacy engines → DuckDuckGo, Brave, Startpage
• Zero tracking → No history/profile building

**❌ WITHOUT VPN (What You're Exposing):**
• Real IP address → Search engines see you
• ISP tracking → Your provider knows what you search  
• Location data → Geographic profiling
• Search patterns → Behavioral analysis

**❌ LIMITATIONS (What You're NOT Getting):**
• Real-time news → 15-30min delay on breaking stories
• Personalized results → No search history optimization  
• Image-heavy search → Limited visual content discovery
• Maps/local results → No location-based queries
• Breaking news alerts → Delayed by design (avoids noise)

## ⚖️ PRIVACY vs PERFORMANCE TRADE-OFFS

**Your Setup:**
• Speed: 95% of Google (250-350ms vs 200ms)
• Privacy: 100% (zero data collection)
• Cost: $0 forever (vs $20/month for "privacy" tools)
• Dependencies: Zero external APIs

**Commercial APIs:**
• Speed: Fast but you pay with your data
• Privacy: 0-60% (they still profile you)
• Cost: Rate limits + data harvesting
• Dependencies: External service uptime

---

## 🔒 VPN REQUIREMENT - MUST BE HIDDEN

**NATIVE SUPPORT:** Deep Private Search automatically routes through any VPN running on your host machine. Docker containers inherit host network routing.

### OPTION 1: ProtonVPN (Free Tier Available)

```bash
# Install ProtonVPN
wget https://repo.protonvpn.com/debian/dists/all/main/binary-amd64/protonvpn-stable-release_1.0.3_all.deb
sudo dpkg -i protonvpn-stable-release_1.0.3_all.deb
sudo apt update && sudo apt install protonvpn

# Connect (free servers available)
protonvpn login
protonvpn connect --fastest
```

### OPTION 2: Mullvad (No Personal Info Required)

```bash
# Download Mullvad
curl -L https://mullvad.net/download/app/linux/latest --output mullvad.deb
sudo dpkg -i mullvad.deb

# Connect (account number only)
mullvad account set [ACCOUNT_NUMBER]
mullvad connect
```

### OPTION 3: System VPN (Any Provider)

```bash
# Generic VPN setup - works with any provider
# 1. Install your VPN client
# 2. Connect to VPN server
# 3. SearXNG automatically routes through VPN

# Verify VPN is active:
curl -s ifconfig.me
# Should show VPN server IP, not your real IP
```

### VPN PERFORMANCE IMPACT:

• **Local searches:** ~250ms → ~350ms (still faster than Google)
• **External calls:** Zero (all traffic encrypted)
• **Privacy level:** Maximum (IP completely masked)

**NOTE:** When VPN is active, your ISP sees encrypted traffic only. All search queries route through VPN before hitting privacy engines.

---

## Quick Start

### 1. Wake claw Up

# Auto-setup (generates secret key + starts container)

./setup.sh

# Or manually

cd docker && docker-compose up -d

It'll be ready at http://localhost:8888

### 2. Teach It to Your AI

cp -r skills/\* ~/.clawdbot/skills/

# Or via ClawdHub

clawdhub install privatedeepsearch-claw

### 3. (Optional) Fire the Competition

Tell Clawdbot to stop using Brave API:

{
"tools": {
"web": {
"search": { "enabled": false }
}
}
}

## How Deep Research Actually Works

You: "explain quantum computing"
│
▼
┌───────────────────────────────┐
│ private deep claw: "Got it. Let me dig." │
└───────────────┬───────────────┘
│
Round 1: "explain quantum computing"
Round 2: "quantum computing detailed analysis"
Round 3: "quantum computing comprehensive guide"
│
▼
┌───────────────────────────────┐
│ SearXNG: _queries 5 engines_ │
│ Returns 10 results per round │
└───────────────┬───────────────┘
│
▼
┌───────────────────────────────┐
│ private deep claw: "YouTube? Facebook? │
│ Nice try. BLOCKED." │
└───────────────┬───────────────┘
│
▼
┌───────────────────────────────┐
│ _Scrapes 10 pages at once_ │
│ asyncio go brrrrrr │
└───────────────┬───────────────┘
│
▼
┌───────────────────────────────┐
│ # Deep Research Report │
│ **Sources:** 17 │
│ ## [1] Quantum 101... │
│ ## [2] IBM's Breakthrough... │
└───────────────────────────────┘

## Privacy Architecture

Your brain
│
▼ (you type a query)
┌─────────────────┐
│ Clawdbot │ ← Your machine. Your rules.
└────────┬────────┘
│
▼
┌─────────────────┐
│ claw │ ← Localhost. No cloud. No logs.
│ (SearXNG) │
└────────┬────────┘
│
▼ (optional but recommended)
┌─────────────────┐
│ Your VPN │ ← Hide your IP from everyone
└────────┬────────┘
│
▼
┌─────────────────┐
│ DuckDuckGo │ ← They see VPN IP, not you
│ Brave Search │
│ Startpage │
└─────────────────┘

Who sees what:

- Google: Nothing. Blocked.
- Your ISP: Encrypted traffic. They mad.
- private deep claw: Everything. But it has amnesia.

## Why Open Source Matters

private deep claw is MIT licensed because:

- You can audit the code — No hidden trackers
- You can fork it — Make your own version
- You can improve it — PRs welcome
- You own your data — It never leaves your machine

Closed-source "privacy" tools ask you to trust them. private deep claw asks you to verify.

## Engines private deep claw Trusts

✅ Enabled:

- DuckDuckGo, Brave Search, Startpage
- Qwant, Mojeek
- Wikipedia, GitHub, StackOverflow, Reddit, arXiv
- Piped, Invidious (YouTube without YouTube)

❌ Blocked:

- Google (all of it)
- Bing (all of it)
- Anything that tracks you

## Requirements

- Docker & Docker Compose
- Python 3.8+
- A healthy distrust of Big Tech

pip install aiohttp beautifulsoup4

## Files

privatedeepsearch-claw/
├── README.md ← You are here
├── docker/
│ ├── docker-compose.yml ← SearXNG deployment
│ └── searxng/settings.yml
├── skills/
│ ├── searxng/ ← Basic search skill
│ └── deep-research/ ← The good stuff
└── docs/
├── PRIVACY.md ← How claw protects you
└── TROUBLESHOOTING.md ← When things break

## Credits

- [SearXNG](https://github.com/searxng/searxng) — The real hero. Privacy-respecting meta-search that makes this possible.
- [OpenWebUI Deep Research](https://github.com/teodorgross/research-openwebui) — Algorithm inspiration
- [Clawdbot](https://clawd.bot) — AI assistant framework

## License

MIT — Do whatever you want. Just don't be evil.

"The best search history is no search history."
— private deep claw

[SearXNG](https://searxng.org) 🧿
