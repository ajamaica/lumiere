#!/usr/bin/env bash
# Search DROYD projects
# Usage: droyd-project-search.sh <type> <queries> [limit] [attributes]
# Example: droyd-project-search.sh "name" "Bitcoin,Ethereum" 10 "market_data,technical_analysis"
# Types: name, symbol, address, semantic, project_id

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

TYPE="${1:-name}"
QUERIES="${2:-}"
LIMIT="${3:-10}"
ATTRIBUTES="${4:-developments,mindshare,market_data}"

if [[ -z "$QUERIES" ]]; then
  echo "Usage: droyd-project-search.sh <type> <queries> [limit] [attributes]" >&2
  echo "Types: name, symbol, address, semantic, project_id" >&2
  exit 1
fi

# Convert comma-separated to JSON array
to_json_array() {
  echo "$1" | tr ',' '\n' | jq -R . | jq -s .
}

DATA=$(jq -n \
  --arg type "$TYPE" \
  --argjson queries "$(to_json_array "$QUERIES")" \
  --argjson limit "$LIMIT" \
  --argjson attrs "$(to_json_array "$ATTRIBUTES")" \
  '{search_type: $type, queries: $queries, limit: $limit, include_attributes: $attrs}')

droyd_request "POST" "/api/v1/projects/search" "$DATA"