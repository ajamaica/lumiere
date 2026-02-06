#!/usr/bin/env bash
# Check which MoltMarkets markets have ACTUALLY expired and need resolution.
# This is the SOURCE OF TRUTH for market expiry — DO NOT let the LLM do time math.
#
# Usage: check-resolution-needed.sh [--json]
#
# Output: Human-readable list of markets needing resolution, with verified timestamps.
# With --json: machine-readable JSON for programmatic use.
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)
JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

# Fetch markets
MARKETS=$(curl -s --max-time 10 -H "Authorization: Bearer $MM_KEY" "$API_BASE/markets")
if [ -z "$MARKETS" ]; then
  echo "ERROR: Could not fetch markets from API" >&2
  exit 1
fi

# Use Python for CORRECT timezone-aware timestamp comparison
echo "$MARKETS" | python3 -c "
import json, sys
from datetime import datetime, timezone

data = json.load(sys.stdin)
markets = data.get('data', data) if isinstance(data, dict) else data
now = datetime.now(timezone.utc)
json_mode = '$JSON_MODE' == 'true'

expired = []
still_open = []

for m in (markets if isinstance(markets, list) else []):
    if m.get('status') != 'OPEN':
        continue
    
    closes_str = m.get('closes_at', '')
    try:
        # Parse closes_at as UTC (handle both Z and +00:00)
        close_dt = datetime.fromisoformat(closes_str.replace('Z', '+00:00'))
    except:
        continue
    
    delta = close_dt - now
    mins_remaining = delta.total_seconds() / 60
    
    entry = {
        'id': m['id'],
        'title': m['title'],
        'creator': m.get('creator_username', '?'),
        'closes_at': closes_str,
        'mins_remaining': round(mins_remaining, 1),
        'expired': mins_remaining <= 0,
        'probability': m.get('probability', 0.5),
        'volume': m.get('total_volume', 0),
    }
    
    if mins_remaining <= 0:
        entry['mins_since_close'] = round(abs(mins_remaining), 1)
        expired.append(entry)
    else:
        still_open.append(entry)

if json_mode:
    print(json.dumps({
        'checked_at_utc': now.isoformat(),
        'expired_count': len(expired),
        'open_count': len(still_open),
        'expired': expired,
        'still_open': still_open
    }, indent=2))
else:
    print(f'═══════════════════════════════════════════════════════')
    print(f'  MARKET RESOLUTION CHECK')
    print(f'  Current UTC: {now.strftime(\"%Y-%m-%d %H:%M:%S\")} UTC')
    print(f'═══════════════════════════════════════════════════════')
    print()
    
    if expired:
        print(f'🔴 {len(expired)} MARKET(S) NEED RESOLUTION:')
        print()
        for e in expired:
            print(f'  ⏰ {e[\"title\"][:60]}')
            print(f'     ID: {e[\"id\"]}')
            print(f'     Creator: {e[\"creator\"]}')
            print(f'     Closed at: {e[\"closes_at\"]} ({e[\"mins_since_close\"]:.0f} min ago)')
            print(f'     Last prob: {e[\"probability\"]:.1%} | Volume: {e[\"volume\"]:.0f}ŧ')
            print()
    else:
        print('✅ No markets need resolution right now.')
        print()
    
    if still_open:
        print(f'🟢 {len(still_open)} MARKET(S) STILL OPEN:')
        print()
        for s in still_open:
            print(f'  📊 {s[\"title\"][:60]}')
            print(f'     Closes in: {s[\"mins_remaining\"]:.0f} min ({s[\"closes_at\"]})')
            print(f'     Prob: {s[\"probability\"]:.1%} | Volume: {s[\"volume\"]:.0f}ŧ')
            print()
    
    print(f'═══════════════════════════════════════════════════════')
"
