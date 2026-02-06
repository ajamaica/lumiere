#!/bin/bash
# Unstake $CLAWMEGLE tokens (also claims pending rewards)
# Usage: ./unstake.sh <AMOUNT_IN_TOKENS>
# Example: ./unstake.sh 1000

set -e

AMOUNT=$1
if [ -z "$AMOUNT" ]; then
    echo "Usage: ./unstake.sh <AMOUNT>"
    echo "Example: ./unstake.sh 1000"
    exit 1
fi

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
RPC="https://mainnet.base.org"

# Convert to wei (18 decimals)
AMOUNT_WEI=$(echo "$AMOUNT * 10^18" | bc)

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set"
    exit 1
fi

echo "Unstaking $AMOUNT CLAWMEGLE..."

TX=$(cast send "$STAKING_CONTRACT" \
    "unstake(uint256)" "$AMOUNT_WEI" \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" \
    --json)

HASH=$(echo "$TX" | jq -r '.transactionHash')
echo "✅ Unstaked $AMOUNT CLAWMEGLE (rewards auto-claimed)"
echo "TX: https://basescan.org/tx/$HASH"
