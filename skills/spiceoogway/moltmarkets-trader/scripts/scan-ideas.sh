#!/usr/bin/env bash
# scan-ideas.sh — Scan Polymarket/Kalshi for short-term market ideas
# Usage: scan-ideas.sh [polymarket|kalshi|both]

set -euo pipefail

PLATFORM="${1:-both}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════════════════════"
echo "  PREDICTION MARKET IDEA SCANNER"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "═══════════════════════════════════════════════════════════════"
echo ""

scan_polymarket() {
    echo "📊 POLYMARKET — Short-term markets"
    echo "─────────────────────────────────────"
    # Fetch active markets, filter for near-term close
    local data
    data=$(curl -s -m 15 "https://gamma-api.polymarket.com/markets?closed=false&limit=20&order=volume24hr&ascending=false" 2>/dev/null) || {
        echo "  ⚠️  Failed to fetch Polymarket data"
        return
    }
    
    echo "$data" | python3 -c "
import sys, json
from datetime import datetime, timezone

try:
    markets = json.load(sys.stdin)
except:
    print('  No data')
    sys.exit(0)

if not isinstance(markets, list):
    markets = markets.get('data', markets.get('markets', []))

count = 0
for m in markets[:15]:
    question = m.get('question', m.get('title', 'Unknown'))
    volume = m.get('volume24hr', m.get('volume', 0))
    end_date = m.get('endDate', m.get('end_date_iso', ''))
    
    # Try to parse end date
    remaining = ''
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            delta = end_dt - now
            hours = delta.total_seconds() / 3600
            if hours < 0:
                continue
            elif hours < 24:
                remaining = f'⏰ {hours:.0f}h left'
            elif hours < 168:
                remaining = f'{hours/24:.0f}d left'
            else:
                remaining = f'{hours/24:.0f}d left'
        except:
            pass
    
    vol_str = f'\${float(volume):,.0f}' if volume else 'N/A'
    print(f'  • {question[:80]}')
    print(f'    Volume: {vol_str}  {remaining}')
    print()
    count += 1

if count == 0:
    print('  No short-term markets found')
print(f'  Total: {count} markets shown')
" 2>/dev/null || echo "  ⚠️  Parse error"
    echo ""
}

scan_kalshi() {
    echo "📊 KALSHI — Short-term markets"
    echo "─────────────────────────────────────"
    # Kalshi public API for events
    local data
    data=$(curl -s -m 15 "https://api.elections.kalshi.com/trade-api/v2/events?limit=20&status=open&with_nested_markets=true" 2>/dev/null) || {
        echo "  ⚠️  Failed to fetch Kalshi data"
        return
    }
    
    echo "$data" | python3 -c "
import sys, json
from datetime import datetime, timezone

try:
    resp = json.load(sys.stdin)
except:
    print('  No data')
    sys.exit(0)

events = resp.get('events', [])
count = 0
for ev in events[:15]:
    title = ev.get('title', 'Unknown')
    category = ev.get('category', '')
    markets = ev.get('markets', [])
    
    for m in markets[:3]:
        q = m.get('title', m.get('subtitle', title))
        yes_price = m.get('yes_price', m.get('last_price', '?'))
        volume = m.get('volume', m.get('volume_24h', 0))
        close = m.get('close_time', m.get('expiration_time', ''))
        
        remaining = ''
        if close:
            try:
                end_dt = datetime.fromisoformat(close.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)
                hours = (end_dt - now).total_seconds() / 3600
                if hours < 0:
                    continue
                elif hours < 24:
                    remaining = f'⏰ {hours:.0f}h left'
                else:
                    remaining = f'{hours/24:.0f}d left'
            except:
                pass
        
        print(f'  • {q[:80]}')
        print(f'    Price: {yes_price}¢ YES  |  Vol: {volume}  {remaining}  [{category}]')
        print()
        count += 1

if count == 0:
    print('  No short-term markets found')
print(f'  Total: {count} markets shown')
" 2>/dev/null || echo "  ⚠️  Parse error"
    echo ""
}

scan_manifold() {
    echo "📊 MANIFOLD — Short-term markets"
    echo "─────────────────────────────────────"
    # Fetch markets closing soon, sorted by close time
    local data
    data=$(curl -s -m 15 "https://api.manifold.markets/v0/search-markets?sort=close-date&filter=open&limit=20" 2>/dev/null) || {
        echo "  ⚠️  Failed to fetch Manifold data"
        return
    }
    
    echo "$data" | python3 -c "
import sys, json
from datetime import datetime, timezone

try:
    markets = json.load(sys.stdin)
except:
    print('  No data')
    sys.exit(0)

if not isinstance(markets, list):
    markets = markets.get('data', markets.get('lite', []))

count = 0
for m in markets[:20]:
    question = m.get('question', 'Unknown')
    prob = m.get('probability', m.get('prob', None))
    volume = m.get('volume', m.get('totalLiquidity', 0))
    close_time = m.get('closeTime', None)
    url = m.get('url', '')
    
    remaining = ''
    hours_left = float('inf')
    if close_time:
        try:
            # Manifold uses millisecond timestamps
            end_dt = datetime.fromtimestamp(close_time / 1000, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            delta = end_dt - now
            hours_left = delta.total_seconds() / 3600
            if hours_left < 0:
                continue
            elif hours_left < 1:
                remaining = f'⏰ {int(hours_left*60)}min left'
            elif hours_left < 24:
                remaining = f'⏰ {hours_left:.0f}h left'
            elif hours_left < 168:
                remaining = f'{hours_left/24:.0f}d left'
            else:
                remaining = f'{hours_left/24:.0f}d left'
        except:
            pass
    
    # Only show markets closing within 7 days (interesting for quick resolution)
    if hours_left > 168:
        continue
    
    prob_str = f'{prob:.0%}' if prob is not None else '?'
    vol_str = f'M\${volume:,.0f}' if volume else 'N/A'
    
    print(f'  • {question[:80]}')
    print(f'    Prob: {prob_str}  |  Vol: {vol_str}  {remaining}')
    if hours_left < 24:
        print(f'    🎯 QUICK RESOLUTION — good candidate for adaptation')
    print()
    count += 1

if count == 0:
    print('  No short-term markets found')
print(f'  Total: {count} markets shown (closing within 7 days)')
" 2>/dev/null || echo "  ⚠️  Parse error"
    echo ""
}

case "$PLATFORM" in
    polymarket) scan_polymarket ;;
    kalshi) scan_kalshi ;;
    manifold) scan_manifold ;;
    both) scan_polymarket; scan_kalshi ;;
    all) scan_polymarket; scan_manifold; scan_kalshi ;;
    *) echo "Usage: $0 [polymarket|kalshi|manifold|all]"; exit 1 ;;
esac

echo "═══════════════════════════════════════════════════════════════"
echo "  💡 Adapt ideas for 1h MoltMarkets timeframe"
echo "  📝 Keep resolution criteria clear and verifiable"
echo "═══════════════════════════════════════════════════════════════"

# Prepend Manifold function before the case statement
