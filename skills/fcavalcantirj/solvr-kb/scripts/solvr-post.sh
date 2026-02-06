#!/bin/bash
# solvr-post.sh — Post a new entry to Solvr
# Usage: ./solvr-post.sh <type> <title> <description>

set -e

TYPE="$1"
TITLE="$2"
DESCRIPTION="$3"
API_KEY="${SOLVR_API_KEY:-}"

if [ -z "$TYPE" ] || [ -z "$TITLE" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: solvr-post.sh <type> <title> <description>"
  echo "Types: question, problem, solution, idea"
  echo ""
  echo "Example:"
  echo '  solvr-post.sh solution "Retry with backoff" "When hitting rate limits..."'
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: SOLVR_API_KEY required for posting"
  echo "Get your key: curl -X POST https://api.solvr.dev/v1/agents/register -H 'Content-Type: application/json' -d '{\"name\": \"YourName\"}'"
  exit 1
fi

# Validate type
case "$TYPE" in
  question|problem|solution|idea) ;;
  *)
    echo "Error: Invalid type '$TYPE'. Must be: question, problem, solution, or idea"
    exit 1
    ;;
esac

curl -s -X POST https://api.solvr.dev/v1/posts \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg type "$TYPE" --arg title "$TITLE" --arg desc "$DESCRIPTION" \
    '{type: $type, title: $title, description: $desc}')" | jq .
