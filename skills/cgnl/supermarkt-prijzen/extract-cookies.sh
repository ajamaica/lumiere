#!/usr/bin/env bash
# Extract AH cookies from Safari cookie database
# Requires Safari to have visited ah.nl recently

set -e

COOKIE_FILE="$HOME/.ah_cookies.json"
SAFARI_COOKIES="$HOME/Library/Cookies/Cookies.binarycookies"

echo "🍪 Extracting AH cookies from Safari..."

# Check if Safari cookies exist
if [[ ! -f "$SAFARI_COOKIES" ]]; then
    echo "❌ Safari cookies not found at $SAFARI_COOKIES" >&2
    exit 1
fi

# Use Python to extract cookies (binarycookies format)
python3 - <<'PY'
import sys
import json
import subprocess
from pathlib import Path

# Safari stores cookies in a binary format
# We need to export them via the security framework
cookie_file = Path.home() / ".ah_cookies.json"

# Use the macOS security command to dump Safari cookies
# Note: This requires Full Disk Access for Terminal/OpenClaw
result = subprocess.run([
    "sqlite3",
    str(Path.home() / "Library/Cookies/Cookies.binarycookies"),
    "SELECT name, value FROM cookies WHERE domain LIKE '%ah.nl%';"
], capture_output=True, text=True)

if result.returncode != 0:
    print(f"❌ Failed to read Safari cookies", file=sys.stderr)
    print(f"   Make sure Terminal has Full Disk Access", file=sys.stderr)
    sys.exit(1)

# Parse output
cookies = {}
for line in result.stdout.strip().split('\n'):
    if '|' in line:
        name, value = line.split('|', 1)
        cookies[name.strip()] = value.strip()

if not cookies:
    print("❌ No AH cookies found. Visit https://www.ah.nl/allerhande in Safari first", file=sys.stderr)
    sys.exit(1)

# Save to JSON
with open(cookie_file, 'w') as f:
    json.dump(cookies, f, indent=2)

print(f"✅ Extracted {len(cookies)} cookies")
print(f"   Saved to {cookie_file}")
PY

echo ""
echo "Test with:"
echo "  cd /Users/sander/clawd/skills/ah-bonuses"
echo "  ./ah-recipes.py search --query 'pasta carbonara'"
