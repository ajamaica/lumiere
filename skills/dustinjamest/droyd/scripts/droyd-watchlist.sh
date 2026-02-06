#!/usr/bin/env bash
# Get DROYD watchlist
# Usage: droyd-watchlist.sh [scope] [limit]
# Scope: agent (default), swarm, combined

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/droyd.sh"

SCOPE="${1:-agent}"
LIMIT="${2:-20}"

DATA=$(jq -n \
  --arg scope "$SCOPE" \
  --argjson limit "$LIMIT" \
  '{scope: $scope, limit: $limit, include_attributes: ["developments", "mindshare", "market_data"]}')

droyd_request "POST" "/api/v1/projects/watchlist" "$DATA"