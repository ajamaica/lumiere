#!/bin/bash
# Check if global emergency is active
# Usage: ./check-emergency.sh

KILLSWITCH="0x6324A4640DA739EEA64013912b781125A76D7D87"
RPC="https://sepolia.base.org"

echo "Checking global emergency status..."

# Try to check if the global emergency is active
RESULT=$(cast call $KILLSWITCH "globalEmergencyActive()(bool)" --rpc-url $RPC 2>&1)

if [[ "$RESULT" == "true" ]]; then
  echo "🚨 GLOBAL EMERGENCY ACTIVE - All agents halted"
  exit 1
elif [[ "$RESULT" == "false" ]]; then
  echo "✅ No global emergency - Agents can operate"
  exit 0
else
  echo "⚠️ Could not check emergency status: $RESULT"
  exit 2
fi
