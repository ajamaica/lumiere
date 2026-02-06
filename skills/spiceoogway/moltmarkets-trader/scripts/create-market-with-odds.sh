#!/usr/bin/env bash
# Create a MoltMarkets market and immediately bet to set initial odds.
#
# Usage: create-market-with-odds.sh "title" "description" <duration_minutes> <estimated_prob> [seed_amount]
#
#   estimated_prob  - Your estimated YES probability as a decimal (0.01-0.99)
#   seed_amount     - Amount in ŧ to seed (default: 25). Larger = more price impact.
#
# Example:
#   create-market-with-odds.sh "Will BTC hit $80K by Friday?" "Resolves YES if..." 360 0.30 25
#   → Creates market, then bets 25ŧ on NO to push price from 50% toward 30%.
#
set -euo pipefail

API_BASE="https://api.zcombinator.io/molt"
MM_KEY=$(cat ~/secrets/moltmarkets-api-key)

if [ $# -lt 4 ]; then
  echo "Usage: $0 \"title\" \"description\" <duration_minutes> <estimated_prob> [seed_amount]"
  echo ""
  echo "  title             - Market question (yes/no)"
  echo "  description       - Resolution criteria"
  echo "  duration_minutes  - Minutes until close"
  echo "  estimated_prob    - Your estimated YES probability (0.01-0.99)"
  echo "  seed_amount       - ŧ to seed the odds (default: 25)"
  echo ""
  echo "If estimated_prob > 0.50 → bets YES to push price up."
  echo "If estimated_prob < 0.50 → bets NO to push price down."
  echo "If estimated_prob == 0.50 → skips the seed bet."
  exit 1
fi

TITLE="$1"
DESCRIPTION="$2"
DURATION="$3"
EST_PROB="$4"
SEED_AMOUNT="${5:-25}"

# Validate estimated_prob
if ! python3 -c "
p = float('$EST_PROB')
assert 0.01 <= p <= 0.99, f'estimated_prob must be 0.01-0.99, got {p}'
" 2>/dev/null; then
  echo "Error: estimated_prob must be between 0.01 and 0.99 (got: $EST_PROB)"
  exit 1
fi

# ── Step 1: Create the market ──
echo "═══════════════════════════════════════"
echo "  STEP 1: CREATE MARKET"
echo "═══════════════════════════════════════"

# Calculate closes_at
if [[ "$OSTYPE" == "darwin"* ]]; then
  CLOSES_AT=$(date -u -v+"${DURATION}M" '+%Y-%m-%dT%H:%M:%SZ')
else
  CLOSES_AT=$(date -u -d "+${DURATION} minutes" '+%Y-%m-%dT%H:%M:%SZ')
fi

printf '  Title: %s\n' "$TITLE"
echo "  Est. prob: ${EST_PROB} (will seed toward this)"
echo "  Seed amount: ${SEED_AMOUNT}ŧ"
echo "  Duration: ${DURATION}m → closes $CLOSES_AT"
echo "───────────────────────────────────────"

PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
    'title': sys.argv[1],
    'description': sys.argv[2],
    'closes_at': sys.argv[3]
}))
" "$TITLE" "$DESCRIPTION" "$CLOSES_AT")

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $MM_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$API_BASE/markets")

# Extract market ID
MARKET_ID=$(echo "$CREATE_RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    if 'id' in d:
        print(d['id'])
    else:
        print('ERROR:' + json.dumps(d))
        sys.exit(1)
except Exception as e:
    print(f'ERROR:{e}')
    sys.exit(1)
" 2>&1)

if [[ "$MARKET_ID" == ERROR:* ]]; then
  echo "  ❌ Market creation failed!"
  echo "  $MARKET_ID"
  exit 1
fi

echo "  ✅ Market created: $MARKET_ID"

# ── Step 2: Seed bet to set initial odds ──
# Determine direction: if est < 0.50 → bet NO, if est > 0.50 → bet YES
SEED_INFO=$(python3 -c "
est = float('$EST_PROB')
if abs(est - 0.5) < 0.02:
    print('SKIP|SKIP|Market already near estimated odds')
elif est > 0.5:
    print(f'YES|$SEED_AMOUNT|Push from 50% toward {est:.0%}')
else:
    print(f'NO|$SEED_AMOUNT|Push from 50% toward {est:.0%}')
")

OUTCOME=$(echo "$SEED_INFO" | cut -d'|' -f1)
AMOUNT=$(echo "$SEED_INFO" | cut -d'|' -f2)
REASON=$(echo "$SEED_INFO" | cut -d'|' -f3)

if [ "$OUTCOME" = "SKIP" ]; then
  echo ""
  echo "  ⏭️  Skipping seed bet — $REASON"
  echo "═══════════════════════════════════════"
  # Output JSON summary for the agent to parse
  echo ""
  python3 -c "
import json, sys
result = {
    'market_id': '$MARKET_ID',
    'title': sys.argv[1],
    'closes_at': '$CLOSES_AT',
    'estimated_prob': $EST_PROB,
    'seed_bet': None
}
print('RESULT_JSON:' + json.dumps(result))
" "$TITLE"
  exit 0
fi

echo ""
echo "═══════════════════════════════════════"
echo "  STEP 2: SEED BET → $OUTCOME ${AMOUNT}ŧ"
echo "═══════════════════════════════════════"
echo "  $REASON"
echo "───────────────────────────────────────"

# Small delay to let the market settle in the API
sleep 1

BET_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $MM_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"outcome\": \"$OUTCOME\", \"amount\": $AMOUNT}" \
  "$API_BASE/markets/$MARKET_ID/bet")

# Parse bet result
BET_RESULT=$(echo "$BET_RESPONSE" | python3 -c "
import json, sys
try:
    r = json.load(sys.stdin)
    if 'bet_id' in r:
        print(f'OK|{r[\"probability_after\"]:.4f}|{r[\"shares\"]:.4f}|{r[\"bet_id\"]}')
    else:
        print(f'FAIL|{json.dumps(r)}')
except Exception as e:
    print(f'FAIL|{e}')
" 2>&1)

BET_STATUS=$(echo "$BET_RESULT" | cut -d'|' -f1)

if [ "$BET_STATUS" = "OK" ]; then
  PROB_AFTER=$(echo "$BET_RESULT" | cut -d'|' -f2)
  SHARES=$(echo "$BET_RESULT" | cut -d'|' -f3)
  BET_ID=$(echo "$BET_RESULT" | cut -d'|' -f4)
  echo "  ✅ Seed bet placed!"
  echo "  Bet ID: $BET_ID"
  echo "  Shares: $SHARES"
  echo "  Prob after: $PROB_AFTER (target: $EST_PROB)"
  echo "═══════════════════════════════════════"
  echo ""
  python3 -c "
import json, sys
result = {
    'market_id': '$MARKET_ID',
    'title': sys.argv[1],
    'closes_at': '$CLOSES_AT',
    'estimated_prob': $EST_PROB,
    'seed_bet': {
        'outcome': '$OUTCOME',
        'amount': $AMOUNT,
        'prob_after': $PROB_AFTER,
        'shares': $SHARES,
        'bet_id': '$BET_ID'
    }
}
print('RESULT_JSON:' + json.dumps(result))
" "$TITLE"
else
  FAIL_MSG=$(echo "$BET_RESULT" | cut -d'|' -f2-)
  echo "  ⚠️  Seed bet failed (market still created): $FAIL_MSG"
  echo "═══════════════════════════════════════"
  echo ""
  python3 -c "
import json, sys
result = {
    'market_id': '$MARKET_ID',
    'title': sys.argv[1],
    'closes_at': '$CLOSES_AT',
    'estimated_prob': $EST_PROB,
    'seed_bet': 'failed: $FAIL_MSG'
}
print('RESULT_JSON:' + json.dumps(result))
" "$TITLE"
  exit 0  # Don't fail — market was created successfully
fi
