#!/bin/bash
# Check if an agent is compliant with the Constitution
# Usage: ./check-compliance.sh <agentId>

AGENT_ID="${1:?Usage: ./check-compliance.sh <agentId>}"
REGISTRY="0xcCFc2B8274ffb579A9403D85ee3128974688C04B"
RPC="https://sepolia.base.org"

echo "Checking compliance for agent #$AGENT_ID..."

RESULT=$(cast call $REGISTRY "isCompliant(uint256)(bool)" $AGENT_ID --rpc-url $RPC 2>&1)

if [[ "$RESULT" == "true" ]]; then
  echo "✅ Agent #$AGENT_ID is COMPLIANT"
  exit 0
elif [[ "$RESULT" == "false" ]]; then
  echo "❌ Agent #$AGENT_ID is NOT COMPLIANT"
  exit 1
else
  echo "⚠️ Error checking compliance: $RESULT"
  exit 2
fi
