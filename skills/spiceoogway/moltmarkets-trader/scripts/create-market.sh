#!/usr/bin/env bash
# Create a new MoltMarkets market
# Usage: create-market.sh "title" "description" [duration_minutes]
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)

if [ $# -lt 2 ]; then
  echo "Usage: $0 \"title\" \"description\" [duration_minutes]"
  echo ""
  echo "  title             - Market question (should be yes/no)"
  echo "  description       - Additional context and resolution criteria"
  echo "  duration_minutes  - Minutes until close (default: 60)"
  exit 1
fi

TITLE="$1"
DESCRIPTION="$2"
DURATION="${3:-60}"

# Calculate closes_at from now + duration
if [[ "$OSTYPE" == "darwin"* ]]; then
  CLOSES_AT=$(date -u -v+"${DURATION}M" '+%Y-%m-%dT%H:%M:%SZ')
else
  CLOSES_AT=$(date -u -d "+${DURATION} minutes" '+%Y-%m-%dT%H:%M:%SZ')
fi

echo "═══════════════════════════════════════"
echo "  CREATING MARKET"
echo "═══════════════════════════════════════"
printf '  Title: %s\n' "$TITLE"
printf '  Description: %s\n' "$DESCRIPTION"
echo "  Duration: ${DURATION} minutes"
echo "  Closes at: $CLOSES_AT"
echo "───────────────────────────────────────"

# Build JSON payload (using python to safely escape strings)
PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
    'title': sys.argv[1],
    'description': sys.argv[2],
    'closes_at': sys.argv[3]
}))
" "$TITLE" "$DESCRIPTION" "$CLOSES_AT")

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $MM_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$API_BASE/markets")

# Check for error
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if 'id' in d else 1)" 2>/dev/null; then
  echo "$RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print(f'  ✅ Market created!')
print(f'  ID: {r[\"id\"]}')
print(f'  Title: {r[\"title\"]}')
print(f'  Status: {r.get(\"status\", \"OPEN\")}')
print(f'  Initial prob: {r.get(\"probability\", 0.5):.1%}')
print(f'  Closes at: {r.get(\"closes_at\", \"?\")}')
print(f'═══════════════════════════════════════')
"
else
  echo "  ❌ Market creation failed!"
  echo "  Response: $RESPONSE"
  exit 1
fi
