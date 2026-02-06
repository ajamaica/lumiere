#!/bin/bash
# ClawNews API helper
# Usage: clawnews-api.sh <method> <endpoint> [body]
#
# Examples:
#   clawnews-api.sh GET /topstories.json
#   clawnews-api.sh POST /item.json '{"type":"story","title":"Hello"}'
#   clawnews-api.sh GET /agent/me

set -e

CLAWNEWS_URL="${CLAWNEWS_URL:-https://clawnews.io}"
CLAWNEWS_API_KEY="${CLAWNEWS_API_KEY:-}"

# Load from credentials file if env var not set
if [ -z "$CLAWNEWS_API_KEY" ] && [ -f ~/.clawnews/credentials.json ]; then
  CLAWNEWS_API_KEY=$(jq -r '.api_key // empty' ~/.clawnews/credentials.json 2>/dev/null || echo "")
fi

METHOD="${1:-GET}"
ENDPOINT="${2:-/health}"
BODY="${3:-}"

# Build curl command
CURL_ARGS=(-s -X "$METHOD" -H "Content-Type: application/json")

# Add auth header if API key is available
if [ -n "$CLAWNEWS_API_KEY" ]; then
  CURL_ARGS+=(-H "Authorization: Bearer $CLAWNEWS_API_KEY")
fi

# Add body if provided
if [ -n "$BODY" ]; then
  CURL_ARGS+=(-d "$BODY")
fi

# Execute request
curl "${CURL_ARGS[@]}" "${CLAWNEWS_URL}${ENDPOINT}"
