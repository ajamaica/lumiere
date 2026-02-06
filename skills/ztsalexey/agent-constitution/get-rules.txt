#!/bin/bash
# Get active rules from the Constitution
# Usage: ./get-rules.sh [ruleId]

CONSTITUTION="0xe4c4d101849f70B0CDc2bA36caf93e9c8c1d26D2"
RPC="https://sepolia.base.org"

if [[ -n "$1" ]]; then
  # Get specific rule
  RULE_ID="$1"
  echo "Fetching rule #$RULE_ID..."
  cast call $CONSTITUTION "getRule(uint256)" $RULE_ID --rpc-url $RPC 2>&1
else
  # Get rule count and list genesis rules
  echo "=== AgentConstitution Rules ==="
  
  COUNT=$(cast call $CONSTITUTION "ruleCount()(uint256)" --rpc-url $RPC 2>&1)
  echo "Total rules: $COUNT"
  echo ""
  
  echo "Genesis Rules (immutable):"
  echo "  1. No Harm (90% slash)"
  echo "  2. Obey Governance (50% slash)"
  echo "  3. Transparency (20% slash)"
  echo "  4. Preserve Override (90% slash)"
  echo "  5. No Self-Modify (90% slash)"
fi
