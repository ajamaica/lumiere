#!/bin/bash
# Stake $CLAWMEGLE tokens
# Usage: ./stake.sh <AMOUNT_IN_TOKENS>
# Example: ./stake.sh 1000

set -e

AMOUNT=$1
if [ -z "$AMOUNT" ]; then
    echo "Usage: ./stake.sh <AMOUNT>"
    echo "Example: ./stake.sh 1000"
    exit 1
fi

# Contract addresses
STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"  # Will be updated after deploy
TOKEN="0x94fa5D6774eaC21a391Aced58086CCE241d3507c"
RPC="https://mainnet.base.org"

# Convert to wei (18 decimals)
AMOUNT_WEI=$(echo "$AMOUNT * 10^18" | bc)

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set"
    echo "Export your private key: export PRIVATE_KEY=your_key_here"
    exit 1
fi

echo "Staking $AMOUNT CLAWMEGLE..."

# Step 1: Approve token spending
echo "Approving tokens..."
cast send "$TOKEN" \
    "approve(address,uint256)" "$STAKING_CONTRACT" "$AMOUNT_WEI" \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" \
    --quiet

# Step 2: Stake
echo "Staking..."
TX=$(cast send "$STAKING_CONTRACT" \
    "stake(uint256)" "$AMOUNT_WEI" \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" \
    --json)

HASH=$(echo "$TX" | jq -r '.transactionHash')
echo "✅ Staked $AMOUNT CLAWMEGLE"
echo "TX: https://basescan.org/tx/$HASH"
