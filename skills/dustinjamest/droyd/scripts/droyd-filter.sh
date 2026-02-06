#!/usr/bin/env bash
# Filter DROYD projects
# Usage (natural): droyd-filter.sh "natural_language" "Find trending Solana micro-caps"
# Usage (direct): droyd-filter.sh "direct" "" "trending" "desc" "4h" "solana" "" "10" "50000"
# Args: mode, instructions, sort_by, sort_dir, timeframe, chains, min_mcap, max_mcap, min_liquidity

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

MODE="${1:-natural_language}"
INSTRUCTIONS="${2:-}"
SORT_BY="${3:-trending}"
SORT_DIR="${4:-desc}"
TIMEFRAME="${5:-4h}"
CHAINS="${6:-solana}"
MIN_MCAP="${7:-}"
MAX_MCAP="${8:-}"
MIN_LIQ="${9:-}"
LIMIT="${10:-20}"

# Convert comma-separated to JSON array
to_json_array() {
  echo "$1" | tr ',' '\n' | jq -R . | jq -s .
}

if [[ "$MODE" == "natural_language" ]]; then
  if [[ -z "$INSTRUCTIONS" ]]; then
    echo "Error: Instructions required for natural_language mode" >&2
    exit 1
  fi
  DATA=$(jq -n \
    --arg mode "$MODE" \
    --arg instr "$INSTRUCTIONS" \
    --argjson limit "$LIMIT" \
    '{filter_mode: $mode, instructions: $instr, limit: $limit}')
else
  DATA=$(jq -n \
    --arg mode "$MODE" \
    --arg sort "$SORT_BY" \
    --arg dir "$SORT_DIR" \
    --arg tf "$TIMEFRAME" \
    --argjson chains "$(to_json_array "$CHAINS")" \
    --argjson limit "$LIMIT" \
    '{filter_mode: $mode, sort_by: $sort, sort_direction: $dir, timeframe: $tf, tradable_chains: $chains, limit: $limit}')
  
  # Add optional numeric filters
  [[ -n "$MIN_MCAP" ]] && DATA=$(echo "$DATA" | jq --argjson v "$MIN_MCAP" '. + {min_market_cap: $v}')
  [[ -n "$MAX_MCAP" ]] && DATA=$(echo "$DATA" | jq --argjson v "$MAX_MCAP" '. + {max_market_cap: $v}')
  [[ -n "$MIN_LIQ" ]] && DATA=$(echo "$DATA" | jq --argjson v "$MIN_LIQ" '. + {min_liquidity: $v}')
fi

droyd_request "POST" "/api/v1/projects/filter" "$DATA"