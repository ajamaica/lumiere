#!/usr/bin/env bash
# Search DROYD content
# Usage: droyd-search.sh <mode> <types> [limit] [ecosystems] [categories] [days_back] [query]
# Example (auto): droyd-search.sh "auto" "posts,news" 25 "ethereum,base" "defi" 7 "optional query"
# Example (recent): droyd-search.sh "recent" "posts,news" 25 "ethereum,base" "defi" 7
# Example (semantic): droyd-search.sh "semantic" "posts,tweets" 50 "" "" 7 "What are AI agents?"

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

MODE="${1:-auto}"
TYPES="${2:-posts,news}"
LIMIT="${3:-25}"
ECOSYSTEMS="${4:-}"
CATEGORIES="${5:-}"
DAYS_BACK="${6:-7}"
QUERY="${7:-}"

# Convert comma-separated to JSON array
types_to_json() {
  echo "$1" | tr ',' '\n' | jq -R . | jq -s .
}

# Build request
if [[ "$MODE" == "semantic" ]]; then
  if [[ -z "$QUERY" ]]; then
    echo "Error: Query required for semantic search" >&2
    exit 1
  fi

  DATA=$(jq -n \
    --arg mode "$MODE" \
    --argjson types "$(types_to_json "$TYPES")" \
    --argjson limit "$LIMIT" \
    --argjson days "$DAYS_BACK" \
    --arg query "$QUERY" \
    '{search_mode: $mode, content_types: $types, limit: $limit, days_back: $days, query: $query, include_analysis: true}')
elif [[ "$MODE" == "auto" && -n "$QUERY" ]]; then
  # Auto mode with query - include query and analysis
  DATA=$(jq -n \
    --arg mode "$MODE" \
    --argjson types "$(types_to_json "$TYPES")" \
    --argjson limit "$LIMIT" \
    --argjson days "$DAYS_BACK" \
    --arg query "$QUERY" \
    '{search_mode: $mode, content_types: $types, limit: $limit, days_back: $days, query: $query, include_analysis: true}')
else
  # Recent mode or auto mode without query
  DATA=$(jq -n \
    --arg mode "$MODE" \
    --argjson types "$(types_to_json "$TYPES")" \
    --argjson limit "$LIMIT" \
    --argjson days "$DAYS_BACK" \
    '{search_mode: $mode, content_types: $types, limit: $limit, days_back: $days}')
fi

# Add optional filters
if [[ -n "$ECOSYSTEMS" ]]; then
  DATA=$(echo "$DATA" | jq --argjson eco "$(types_to_json "$ECOSYSTEMS")" '. + {ecosystems: $eco}')
fi

if [[ -n "$CATEGORIES" ]]; then
  DATA=$(echo "$DATA" | jq --argjson cat "$(types_to_json "$CATEGORIES")" '. + {categories: $cat}')
fi

droyd_request "POST" "/api/v1/search" "$DATA"