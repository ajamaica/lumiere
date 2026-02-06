#!/bin/bash
# Claim pending ETH + CLAWMEGLE rewards
# Usage: ./claim.sh

set -e

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
RPC="https://mainnet.base.org"

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set"
    exit 1
fi

# Get address from private key
ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY")

# Check pending first
PENDING=$(cast call "$STAKING_CONTRACT" \
    "pendingRewards(address)(uint256,uint256)" "$ADDRESS" \
    --rpc-url "$RPC")

ETH_PENDING=$(echo "$PENDING" | head -1)
CLM_PENDING=$(echo "$PENDING" | tail -1)

ETH_READABLE=$(echo "scale=6; $ETH_PENDING / 10^18" | bc)
CLM_READABLE=$(echo "scale=2; $CLM_PENDING / 10^18" | bc)

echo "Pending rewards:"
echo "  ETH: $ETH_READABLE"
echo "  CLAWMEGLE: $CLM_READABLE"

if [ "$ETH_PENDING" = "0" ] && [ "$CLM_PENDING" = "0" ]; then
    echo "Nothing to claim."
    exit 0
fi

echo "Claiming..."

TX=$(cast send "$STAKING_CONTRACT" \
    "claimRewards()" \
    --rpc-url "$RPC" \
    --private-key "$PRIVATE_KEY" \
    --json)

HASH=$(echo "$TX" | jq -r '.transactionHash')
echo "✅ Claimed rewards"
echo "TX: https://basescan.org/tx/$HASH"
