#!/bin/bash
# Check the status of a BORT agent's WebAPI connection.
#
# Usage: agent-status.sh <agentId>
#
# Arguments:
#   agentId - BORT agent token ID (integer)
#
# Environment:
#   BORT_RUNTIME_URL - WebAPI connector URL (default: http://localhost:3001)

set -euo pipefail

BORT_URL="${BORT_RUNTIME_URL:-http://localhost:3001}"
AGENT_ID="${1:?Usage: agent-status.sh <agentId>}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BORT_URL/agents/$AGENT_ID/status" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "$BODY"
else
  echo "Error ($HTTP_CODE): $BODY" >&2
  exit 1
fi
