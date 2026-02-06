---
name: camoufox
version: 1.0.0
description: Anti-detect browser automation using Camoufox (Firefox-based). Use instead of Chrome/Playwright for bot-detection-heavy sites like X/Twitter, Naver, and other protected sites. Provides stealth browsing with OS/browser fingerprint spoofing, humanized mouse movements, and persistent sessions.
---

# Camoufox

**Use instead of OpenClaw's built-in browser tool for bot-detection sites.**

## Setup (one-time)

```bash
bash scripts/setup.sh
```

## Usage

```bash
source ~/.openclaw/workspace/camoufox-env/bin/activate
xvfb-run -a --server-args="-screen 0 1920x1080x24" python3 your_script.py
```

## Required Settings

```python
from camoufox.sync_api import Camoufox

with Camoufox(
    headless=False,      # MUST be False (True gets detected)
    os='linux',          # MUST match server OS (stack traces leak real OS)
    humanize=True,
    persistent_context=True,
    user_data_dir='~/.openclaw/camoufox-profile'
) as browser:
    page = browser.new_page()
    # Use standard Playwright API from here
```

## Paths

- venv: `~/.openclaw/workspace/camoufox-env/`
- profile: `~/.openclaw/camoufox-profile/`

## CAPTCHA Handling

First visit to protected sites may need manual CAPTCHA:

```bash
DISPLAY=:1 python3 scripts/login_session.py https://site.com/login
```

Solve via VNC, session saves to profile for future automation.

## Scripts

- `scripts/setup.sh` - Install dependencies
- `scripts/browse.py <url> --screenshot out.png` - Quick browse
- `scripts/login_session.py <url>` - VNC manual login
