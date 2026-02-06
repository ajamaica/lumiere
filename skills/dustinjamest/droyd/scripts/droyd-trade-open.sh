#!/usr/bin/env bash
# Open DROYD trade
# Usage (simple): droyd-trade-open.sh <project_id> "market_buy" <amount>
# Usage (managed): droyd-trade-open.sh <project_id> "managed" <amount> <stop_pct> <tp_pct>
# Example: droyd-trade-open.sh 123 "managed" 100 0.10 0.25

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

PROJECT_ID="${1:-}"
TYPE="${2:-market_buy}"
AMOUNT="${3:-100}"
STOP_PCT="${4:-}"
TP_PCT="${5:-}"
RATIONALE="${6:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: droyd-trade-open.sh <project_id> <type> <amount> [stop_%] [tp_%] [rationale]" >&2
  echo "Types: market_buy, managed" >&2
  exit 1
fi

if [[ "$TYPE" == "managed" ]]; then
  # Create managed position with stop loss and take profit
  if [[ -z "$STOP_PCT" || -z "$TP_PCT" ]]; then
    echo "Error: managed type requires stop_pct and tp_pct" >&2
    exit 1
  fi
  
  DATA=$(jq -n \
    --argjson pid "$PROJECT_ID" \
    --argjson amt "$AMOUNT" \
    --argjson stop "$STOP_PCT" \
    --argjson tp "$TP_PCT" \
    '{
      project_id: $pid,
      legs: [
        {type: "market_buy", amountUSD: $amt},
        {type: "stop_loss", amountUSD: $amt, triggerPercent: $stop},
        {type: "take_profit", amountUSD: $amt, triggerPercent: $tp}
      ]
    }')
else
  # Simple market buy
  DATA=$(jq -n \
    --argjson pid "$PROJECT_ID" \
    --argjson amt "$AMOUNT" \
    '{project_id: $pid, legs: [{type: "market_buy", amountUSD: $amt}]}')
fi

# Add rationale if provided
if [[ -n "$RATIONALE" ]]; then
  DATA=$(echo "$DATA" | jq --arg r "$RATIONALE" '. + {rationale: $r}')
fi

droyd_request "POST" "/api/v1/trade/open" "$DATA"