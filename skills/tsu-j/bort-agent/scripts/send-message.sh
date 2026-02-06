#!/bin/bash
# Send a message to a BORT agent via the WebAPI connector.
#
# Usage: send-message.sh <agentId> "<message>" [author]
#
# Arguments:
#   agentId  - BORT agent token ID (integer)
#   message  - Message text to send to the agent
#   author   - Optional sender identifier (default: "openclaw-user")
#
# Environment:
#   BORT_RUNTIME_URL - WebAPI connector URL (default: http://localhost:3001)

set -euo pipefail

BORT_URL="${BORT_RUNTIME_URL:-http://localhost:3001}"
AGENT_ID="${1:?Usage: send-message.sh <agentId> \"<message>\" [author]}"
MESSAGE="${2:?Usage: send-message.sh <agentId> \"<message>\" [author]}"
AUTHOR="${3:-openclaw-user}"

# Build JSON payload with proper escaping
PAYLOAD=$(cat <<EOF
{
  "content": $(echo "$MESSAGE" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
  "author": "$AUTHOR",
  "metadata": {
    "source": "openclaw",
    "timestamp": $(date +%s)
  }
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$BORT_URL/agents/$AGENT_ID/messages" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "$BODY"
else
  echo "Error ($HTTP_CODE): $BODY" >&2
  exit 1
fi
