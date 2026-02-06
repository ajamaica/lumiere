#!/usr/bin/env bash
# Place a bet on a MoltMarkets market
# Usage: place-bet.sh <market_id> <YES|NO> <amount>
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)

if [ $# -lt 3 ]; then
  echo "Usage: $0 <market_id> <YES|NO> <amount>"
  echo ""
  echo "  market_id  - UUID of the market"
  echo "  outcome    - YES or NO"
  echo "  amount     - Amount in ŧ to bet"
  exit 1
fi

MARKET_ID="$1"
OUTCOME=$(echo "$2" | tr '[:lower:]' '[:upper:]')
AMOUNT="$3"

# Validate outcome
if [ "$OUTCOME" != "YES" ] && [ "$OUTCOME" != "NO" ]; then
  echo "Error: outcome must be YES or NO (got: $OUTCOME)"
  exit 1
fi

# Validate amount is a positive number
if ! echo "$AMOUNT" | grep -qE '^[0-9]+\.?[0-9]*$' || [ "$(echo "$AMOUNT <= 0" | bc -l)" -eq 1 ]; then
  echo "Error: amount must be a positive number (got: $AMOUNT)"
  exit 1
fi

echo "═══════════════════════════════════════"
echo "  PLACING BET"
echo "═══════════════════════════════════════"
echo "  Market: $MARKET_ID"
echo "  Outcome: $OUTCOME"
echo "  Amount: ${AMOUNT}ŧ"
echo "───────────────────────────────────────"

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $MM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"outcome\": \"$OUTCOME\", \"amount\": $AMOUNT}" \
  "$API_BASE/markets/$MARKET_ID/bet")

# Check for error
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if 'bet_id' in d else 1)" 2>/dev/null; then
  echo "$RESPONSE" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print(f'  ✅ Bet placed successfully!')
print(f'  Bet ID: {r[\"bet_id\"]}')
print(f'  Shares: {r[\"shares\"]:.4f}')
print(f'  Avg Price: {r[\"avg_price\"]:.4f}')
print(f'  Prob before: {r[\"probability_before\"]:.1%}')
print(f'  Prob after:  {r[\"probability_after\"]:.1%}')
print(f'  Cost: {r[\"amount\"]}ŧ')
print(f'═══════════════════════════════════════')
"
else
  echo "  ❌ Bet failed!"
  echo "  Response: $RESPONSE"
  exit 1
fi
