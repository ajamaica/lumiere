#!/bin/bash
# Get detailed info for a memory resource
# Usage: ./memory-details.sh <memory-id> [region] [profile]

MEMORY_ID="${1:?Usage: ./memory-details.sh <memory-id> [region] [profile]}"
REGION="${2:-us-east-1}"
PROFILE="${3:-}"

if [ -n "$PROFILE" ]; then
  export AWS_PROFILE="$PROFILE"
fi
export AWS_REGION="$REGION"

echo "=== Memory: $MEMORY_ID ==="

aws bedrock-agentcore-control get-memory \
  --memory-id "$MEMORY_ID" \
  --output json 2>/dev/null | \
  jq '{
    id: .id,
    status: .status,
    strategies: [.strategies[]?.name // empty],
    eventExpiry: .eventExpiryDuration,
    created: .createdAt
  }'
