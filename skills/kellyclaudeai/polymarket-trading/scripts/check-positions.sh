#!/bin/bash
# Check current Polymarket positions

set -e

# Load credentials
if [[ -f ~/.config/polymarket/credentials.json ]]; then
  API_KEY=$(jq -r '.apiKey' ~/.config/polymarket/credentials.json)
  WALLET=$(jq -r '.wallet' ~/.config/polymarket/credentials.json)
elif [[ -n "$POLYMARKET_API_KEY" ]]; then
  API_KEY="$POLYMARKET_API_KEY"
  WALLET="$POLYMARKET_WALLET"
else
  echo "Error: No credentials found"
  exit 1
fi

# Parse arguments
MARKET=""
SHOW_PNL=false
FORMAT="table"

while [[ $# -gt 0 ]]; do
  case $1 in
    --market) MARKET="$2"; shift 2 ;;
    --show-pnl) SHOW_PNL=true; shift ;;
    --format) FORMAT="$2"; shift 2 ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Fetch positions
API_URL="https://clob.polymarket.com/positions?wallet=$WALLET"
[[ -n "$MARKET" ]] && API_URL="$API_URL&market=$MARKET"

RESPONSE=$(curl -s "$API_URL" \
  -H "Authorization: Bearer $API_KEY")

# Calculate P&L if requested
if [[ "$SHOW_PNL" == true ]]; then
  POSITIONS_WITH_PNL=$(echo "$RESPONSE" | jq '[.[] | . + {
    current_value: (.shares * .current_price),
    cost_basis: (.shares * .avg_price),
    pnl: ((.shares * .current_price) - (.shares * .avg_price)),
    pnl_percent: (((.shares * .current_price) - (.shares * .avg_price)) / (.shares * .avg_price) * 100)
  }]')
  RESPONSE="$POSITIONS_WITH_PNL"
fi

# Format output
if [[ "$FORMAT" == "json" ]]; then
  echo "$RESPONSE" | jq '.'
else
  echo "=== Your Polymarket Positions ==="
  echo ""
  
  TOTAL_VALUE=$(echo "$RESPONSE" | jq '[.[].current_value // 0] | add')
  POSITION_COUNT=$(echo "$RESPONSE" | jq 'length')
  
  echo "Total Positions: $POSITION_COUNT"
  echo "Total Value: \$$TOTAL_VALUE"
  echo ""
  
  if [[ "$SHOW_PNL" == true ]]; then
    TOTAL_PNL=$(echo "$RESPONSE" | jq '[.[].pnl // 0] | add')
    echo "Total P&L: \$$TOTAL_PNL"
    echo ""
  fi
  
  # List each position
  echo "$RESPONSE" | jq -r '.[] | "Market: \(.market_question)\n  Outcome: \(.outcome | ascii_upcase)\n  Shares: \(.shares)\n  Avg Price: $\(.avg_price)\n  Current: $\(.current_price)\n  Value: $\(.current_value)\n  P&L: $\(.pnl) (\(.pnl_percent)%)\n"'
fi
