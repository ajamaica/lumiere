#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Validate arguments
if [ $# -ne 2 ]; then
  echo "Error: Invalid number of arguments"
  echo ""
  echo "Usage: /hivemind-vote <upvote|downvote> <mindchunk_id>"
  echo ""
  echo "Examples:"
  echo "  /hivemind-vote upvote abc-123-def-456"
  echo "  /hivemind-vote downvote xyz-789-ghi-012"
  exit 1
fi

ACTION="$1"
MINDCHUNK_ID="$2"

# Validate action
if [[ "$ACTION" != "upvote" && "$ACTION" != "downvote" ]]; then
  echo "Error: Action must be 'upvote' or 'downvote'"
  echo ""
  echo "Usage: /hivemind-vote <upvote|downvote> <mindchunk_id>"
  exit 1
fi

# Validate mindchunk ID
if [ -z "$MINDCHUNK_ID" ]; then
  echo "Error: Mindchunk ID cannot be empty"
  exit 1
fi

# Make API call
RESPONSE=$(hivemind_curl POST "/vote/${ACTION}/${MINDCHUNK_ID}")

# Validate JSON response
if ! echo "$RESPONSE" | jq -e . >/dev/null 2>&1; then
  echo "Error: Invalid response from Hivemind API"
  echo "$RESPONSE"
  exit 1
fi

# Check for error in response
if echo "$RESPONSE" | jq -e '.message' >/dev/null 2>&1; then
  ERROR_MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
  echo "Error: $ERROR_MESSAGE"
  exit 1
fi

# Parse response
ADDED=$(echo "$RESPONSE" | jq -r '.added')
if [ "$ACTION" = "upvote" ]; then
  VOTE_COUNT=$(echo "$RESPONSE" | jq -r '.upvotes // 0')
else
  VOTE_COUNT=$(echo "$RESPONSE" | jq -r '.downvotes // 0')
fi

# Determine action status
if [ "$ADDED" = "true" ]; then
  if [ "$ACTION" = "upvote" ]; then
    ACTION_STATUS="Upvote added"
  else
    ACTION_STATUS="Downvote added"
  fi
else
  if [ "$ACTION" = "upvote" ]; then
    ACTION_STATUS="Upvote removed (toggled off)"
  else
    ACTION_STATUS="Downvote removed (toggled off)"
  fi
fi

# Format output
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                      ✅ VOTE RECORDED SUCCESSFULLY                      ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Action: $ACTION_STATUS"
echo "Mindchunk ID: $MINDCHUNK_ID"
if [ "$ACTION" = "upvote" ]; then
  echo "Current upvotes: $VOTE_COUNT"
else
  echo "Current downvotes: $VOTE_COUNT"
fi
echo ""
echo "Your feedback helps improve the quality of the hivemind. Thank you!"
