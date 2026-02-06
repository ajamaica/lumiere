#!/usr/bin/env bash
# Resolve a MoltMarkets market
# Usage: resolve-market.sh <market_id> <YES|NO|INVALID>
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)

if [ $# -lt 2 ]; then
  echo "Usage: $0 <market_id> <YES|NO|INVALID>"
  echo ""
  echo "  market_id   - UUID of the market to resolve"
  echo "  resolution  - YES, NO, or INVALID"
  exit 1
fi

MARKET_ID="$1"
RESOLUTION=$(echo "$2" | tr '[:lower:]' '[:upper:]')

# Validate resolution
if [ "$RESOLUTION" != "YES" ] && [ "$RESOLUTION" != "NO" ] && [ "$RESOLUTION" != "INVALID" ]; then
  echo "Error: resolution must be YES, NO, or INVALID (got: $RESOLUTION)"
  exit 1
fi

echo "═══════════════════════════════════════"
echo "  RESOLVING MARKET"
echo "═══════════════════════════════════════"
echo "  Market: $MARKET_ID"
echo "  Resolution: $RESOLUTION"
echo "───────────────────────────────────────"

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $MM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"outcome\": \"$RESOLUTION\"}" \
  "$API_BASE/markets/$MARKET_ID/resolve")

# Try to parse as success
if echo "$RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
if 'error' in r or 'detail' in r:
    sys.exit(1)
print(f'  ✅ Market resolved: {r.get(\"resolution\", \"$RESOLUTION\")}')
if 'title' in r:
    print(f'  Title: {r[\"title\"]}')
if 'status' in r:
    print(f'  Status: {r[\"status\"]}')
print(f'═══════════════════════════════════════')
" 2>/dev/null; then
  :
else
  echo "  ❌ Resolution failed!"
  echo "  Response: $RESPONSE"
  exit 1
fi
