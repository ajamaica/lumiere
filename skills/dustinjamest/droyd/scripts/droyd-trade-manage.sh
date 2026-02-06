#!/usr/bin/env bash
# Manage DROYD trade
# Usage: droyd-trade-manage.sh <strategy_id> <action> [param]
# Actions: close, sell (with percent), buy (with amount)
# Example: droyd-trade-manage.sh 789 "close"
# Example: droyd-trade-manage.sh 789 "sell" 0.5
# Example: droyd-trade-manage.sh 789 "buy" 50

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

STRATEGY_ID="${1:-}"
ACTION="${2:-close}"
PARAM="${3:-}"

if [[ -z "$STRATEGY_ID" ]]; then
  echo "Usage: droyd-trade-manage.sh <strategy_id> <action> [param]" >&2
  echo "Actions: close, sell (pct 0-1), buy (amount USD)" >&2
  exit 1
fi

case "$ACTION" in
  close)
    DATA=$(jq -n \
      --argjson sid "$STRATEGY_ID" \
      '{strategy_id: $sid, action: "close"}')
    ;;
  sell)
    if [[ -z "$PARAM" ]]; then
      echo "Error: sell requires percent (0-1)" >&2
      exit 1
    fi
    DATA=$(jq -n \
      --argjson sid "$STRATEGY_ID" \
      --argjson pct "$PARAM" \
      '{strategy_id: $sid, action: "sell", sellPercent: $pct}')
    ;;
  buy)
    if [[ -z "$PARAM" ]]; then
      echo "Error: buy requires amount USD" >&2
      exit 1
    fi
    DATA=$(jq -n \
      --argjson sid "$STRATEGY_ID" \
      --argjson amt "$PARAM" \
      '{strategy_id: $sid, action: "buy", amountUSD: $amt}')
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    exit 1
    ;;
esac

droyd_request "POST" "/api/v1/trade/manage" "$DATA"