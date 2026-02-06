#!/bin/bash
# Unstake $CLAWMEGLE via Bankr (auto-claims rewards)
# Usage: ./unstake-bankr.sh <AMOUNT>

set -e

AMOUNT=$1
if [ -z "$AMOUNT" ]; then
    echo "Usage: ./unstake-bankr.sh <AMOUNT>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"

AMOUNT_WEI=$(printf '%d' $(echo "$AMOUNT * 1000000000000000000" | bc))

echo "Unstaking $AMOUNT CLAWMEGLE via Bankr..."

"$SCRIPT_DIR/bankr.sh" "Submit this transaction on Base: {\"to\": \"$STAKING_CONTRACT\", \"data\": \"0x2e1a7d4d$(printf '%064x' $AMOUNT_WEI)\", \"value\": \"0\", \"chainId\": 8453}"

echo "✅ Unstaked $AMOUNT CLAWMEGLE (rewards auto-claimed)"
