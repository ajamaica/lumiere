#!/bin/bash
# Check staking status via Bankr
# Usage: ./check-bankr.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"

echo "Checking staking status..."

# Get wallet address and check pending rewards
"$SCRIPT_DIR/bankr.sh" "What is my wallet address on Base? Then call the pendingRewards function on contract $STAKING_CONTRACT with my address to check my staking rewards"
