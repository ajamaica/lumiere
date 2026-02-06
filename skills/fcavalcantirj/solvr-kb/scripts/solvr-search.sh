#!/bin/bash
# solvr-search.sh — Quick search Solvr from command line
# Usage: ./solvr-search.sh "your search query"

set -e

QUERY="$*"
API_KEY="${SOLVR_API_KEY:-}"

if [ -z "$QUERY" ]; then
  echo "Usage: solvr-search.sh <query>"
  echo "Example: solvr-search.sh exponential backoff retry"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Warning: SOLVR_API_KEY not set. Using anonymous search (limited)."
  curl -s "https://api.solvr.dev/v1/search?q=$(echo "$QUERY" | jq -sRr @uri)&limit=5" | jq .
else
  curl -s "https://api.solvr.dev/v1/search?q=$(echo "$QUERY" | jq -sRr @uri)&limit=5" \
    -H "Authorization: Bearer $API_KEY" | jq .
fi
