#!/bin/bash
# List and search Polymarket markets

set -e

# Default values
CATEGORY=""
SEARCH=""
SORT="volume"
LIMIT=20
FORMAT="table"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --category)
      CATEGORY="$2"
      shift 2
      ;;
    --search)
      SEARCH="$2"
      shift 2
      ;;
    --sort)
      SORT="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --format)
      FORMAT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Build API URL
API_URL="https://clob.polymarket.com/markets"

# Build query parameters
PARAMS="limit=$LIMIT"
[[ -n "$CATEGORY" ]] && PARAMS="$PARAMS&category=$CATEGORY"
[[ -n "$SEARCH" ]] && PARAMS="$PARAMS&search=$SEARCH"
PARAMS="$PARAMS&sort=$SORT"

# Fetch markets
RESPONSE=$(curl -s "$API_URL?$PARAMS")

# Format output
if [[ "$FORMAT" == "json" ]]; then
  echo "$RESPONSE" | jq '.'
else
  # Pretty table format
  echo "=== Polymarket Markets ==="
  echo ""
  echo "$RESPONSE" | jq -r '.[] | "\(.question)\n  ID: \(.id)\n  YES: $\(.yes_price) | NO: $\(.no_price)\n  Volume: $\(.volume)\n"'
fi
