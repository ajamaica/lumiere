#!/usr/bin/env bash
# Automatically fetch fresh AH cookies via Playwright + existing browser
set -e

COOKIE_FILE="$HOME/.ah_cookies.json"

echo "🍪 Fetching fresh AH cookies from browser..."

# Check if browser is running
if ! curl -s http://127.0.0.1:18800/json >/dev/null 2>&1; then
    echo "❌ Browser not running. Opening AH page first..."
    # Open page via OpenClaw browser tool
    openclaw browser open --url https://www.ah.nl/allerhande --profile openclaw
    sleep 3
fi

# Extract cookies via Playwright
python3 - <<'PY'
from playwright.sync_api import sync_playwright
import json
from pathlib import Path

with sync_playwright() as p:
    # Connect to existing browser
    browser = p.chromium.connect_over_cdp('http://127.0.0.1:18800')
    
    contexts = browser.contexts
    if not contexts:
        print("❌ No browser contexts found")
        exit(1)
    
    context = contexts[0]
    
    # Find or create AH page
    ah_page = None
    for page in context.pages:
        if 'ah.nl' in page.url:
            ah_page = page
            break
    
    if not ah_page:
        # Open new page if not found
        ah_page = context.new_page()
        ah_page.goto('https://www.ah.nl/allerhande')
        ah_page.wait_for_load_state('networkidle')
    
    # Get cookies
    cookies = context.cookies()
    ah_cookies = [c for c in cookies if 'ah.nl' in c.get('domain', '')]
    
    # Convert to dict
    cookie_obj = {c['name']: c['value'] for c in ah_cookies}
    
    # Save
    cookie_file = Path.home() / '.ah_cookies.json'
    cookie_file.write_text(json.dumps(cookie_obj, indent=2))
    
    print(f"✅ Extracted {len(ah_cookies)} cookies from ah.nl")
    
    browser.close()
PY

echo ""
echo "Test with:"
echo "  cd /Users/sander/clawd/skills/ah-bonuses"
echo "  ./ah-recipes.py search --query 'pasta carbonara'"
