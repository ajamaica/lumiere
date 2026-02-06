#!/bin/bash
# Tail runtime logs for an agent
# Usage: ./tail-logs.sh <agent-id> [since] [region] [profile]

AGENT_ID="${1:?Usage: ./tail-logs.sh <agent-id> [since] [region] [profile]}"
SINCE="${2:-5m}"
REGION="${3:-us-east-1}"
PROFILE="${4:-}"

if [ -n "$PROFILE" ]; then
  export AWS_PROFILE="$PROFILE"
fi
export AWS_REGION="$REGION"

LOG_GROUP="/aws/bedrock-agentcore/runtimes/${AGENT_ID}-DEFAULT"
DATE_PREFIX="$(date +%Y/%m/%d)"

echo "=== Logs for $AGENT_ID (since $SINCE) ==="
aws logs tail "$LOG_GROUP" \
  --log-stream-name-prefix "${DATE_PREFIX}/[runtime-logs]" \
  --since "$SINCE" \
  --format short
