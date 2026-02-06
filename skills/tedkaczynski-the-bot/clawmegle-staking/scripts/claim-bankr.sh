#!/bin/bash
# Claim rewards via Bankr
# Usage: ./claim-bankr.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"

echo "Claiming rewards via Bankr..."

"$SCRIPT_DIR/bankr.sh" "Submit this transaction on Base: {\"to\": \"$STAKING_CONTRACT\", \"data\": \"0x372500ab\", \"value\": \"0\", \"chainId\": 8453}"

echo "✅ Rewards claimed"
