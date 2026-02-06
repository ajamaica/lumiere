#!/bin/bash
# Get detailed info for an agent runtime
# Usage: ./agent-details.sh <agent-id> [region] [profile]

AGENT_ID="${1:?Usage: ./agent-details.sh <agent-id> [region] [profile]}"
REGION="${2:-us-east-1}"
PROFILE="${3:-}"

if [ -n "$PROFILE" ]; then
  export AWS_PROFILE="$PROFILE"
fi
export AWS_REGION="$REGION"

echo "=== Agent: $AGENT_ID ==="

aws bedrock-agentcore-control get-agent-runtime \
  --agent-runtime-id "$AGENT_ID" \
  --output json 2>/dev/null | \
  jq '{
    id: .agentRuntimeId,
    name: .agentRuntimeName,
    status: .status,
    version: .agentRuntimeVersion,
    image: .containerConfiguration?.containerUri,
    memory: .memoryId,
    network: .networkConfiguration?.networkMode
  }'
