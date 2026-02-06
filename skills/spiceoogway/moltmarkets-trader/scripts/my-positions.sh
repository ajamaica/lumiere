#!/usr/bin/env bash
# Show my MoltMarkets balance and positions
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)

echo "═══════════════════════════════════════════════════════════════"
echo "  MY MOLTMARKETS PORTFOLIO"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "═══════════════════════════════════════════════════════════════"

# Fetch profile
PROFILE=$(curl -s -H "Authorization: Bearer $MM_KEY" "$API_BASE/me")

echo "$PROFILE" | python3 -c "
import json, sys
p = json.load(sys.stdin)
print(f'')
print(f'  Account: {p[\"username\"]}')
print(f'  Balance: {p[\"balance\"]:.2f}ŧ')
print(f'  Markets created: {p.get(\"markets_created\", 0)}')
print(f'  Total bets: {p.get(\"total_bets\", 0)}')
print(f'  All-time profit: {p.get(\"profit_all_time\", 0):.2f}ŧ')
print(f'')
"

echo "───────────────────────────────────────────────────────────────"
echo "  MARKETS"
echo "───────────────────────────────────────────────────────────────"

# Fetch all markets to find ones we've participated in
MARKETS=$(curl -s -H "Authorization: Bearer $MM_KEY" "$API_BASE/markets")

echo "$MARKETS" | python3 -c "
import json, sys
from datetime import datetime, timezone

markets = json.load(sys.stdin)
now = datetime.now(timezone.utc)

if not markets:
    print('  No markets found.')
    sys.exit(0)

# Separate by status
open_markets = [m for m in markets if m.get('status') == 'OPEN']
resolved = [m for m in markets if m.get('status') == 'RESOLVED']

if open_markets:
    print(f'')
    print(f'  OPEN ({len(open_markets)}):')
    for m in open_markets:
        prob = m.get('probability', 0.5)
        vol = m.get('total_volume', 0)
        creator = m.get('creator_username', '?')
        
        try:
            close_dt = datetime.fromisoformat(m['closes_at'].replace('Z', '+00:00'))
            delta = close_dt - now
            if delta.total_seconds() <= 0:
                time_left = 'EXPIRED'
            elif delta.days > 0:
                time_left = f'{delta.days}d {delta.seconds // 3600}h'
            elif delta.seconds >= 3600:
                time_left = f'{delta.seconds // 3600}h {(delta.seconds % 3600) // 60}m'
            else:
                time_left = f'{delta.seconds // 60}m'
        except:
            time_left = '?'
        
        mine = ' 👤' if creator == 'spotter' else ''
        print(f'    • {m[\"title\"][:60]}')
        print(f'      {prob:.1%} | {vol:.0f}ŧ vol | {time_left} left{mine}')
        print()

if resolved:
    print(f'  RESOLVED ({len(resolved)}):')
    for m in resolved:
        prob = m.get('probability', 0.5)
        vol = m.get('total_volume', 0)
        creator = m.get('creator_username', '?')
        res = m.get('resolution', '?')
        mine = ' 👤' if creator == 'spotter' else ''
        print(f'    • {m[\"title\"][:60]}')
        print(f'      Resolved: {res} | Final prob: {prob:.1%} | {vol:.0f}ŧ vol{mine}')
        print()

print(f'═══════════════════════════════════════════════════════════════')
"
