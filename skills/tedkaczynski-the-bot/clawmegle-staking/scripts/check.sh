#!/bin/bash
# Check pending rewards and stake balance
# Usage: ./check.sh [ADDRESS]
# If no address provided, uses PRIVATE_KEY to derive address

set -e

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
RPC="https://mainnet.base.org"

ADDRESS=$1

if [ -z "$ADDRESS" ]; then
    if [ -z "$PRIVATE_KEY" ]; then
        echo "Usage: ./check.sh <ADDRESS>"
        echo "Or set PRIVATE_KEY to check your own address"
        exit 1
    fi
    ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY")
fi

echo "Checking staking status for: $ADDRESS"
echo "---"

# Get staked amount
STAKED=$(cast call "$STAKING_CONTRACT" \
    "getStakedAmount(address)(uint256)" "$ADDRESS" \
    --rpc-url "$RPC")

STAKED_READABLE=$(echo "scale=2; $STAKED / 10^18" | bc)
echo "Staked: $STAKED_READABLE CLAWMEGLE"

# Get pending rewards
PENDING=$(cast call "$STAKING_CONTRACT" \
    "pendingRewards(address)(uint256,uint256)" "$ADDRESS" \
    --rpc-url "$RPC")

ETH_PENDING=$(echo "$PENDING" | head -1)
CLM_PENDING=$(echo "$PENDING" | tail -1)

ETH_READABLE=$(echo "scale=6; $ETH_PENDING / 10^18" | bc)
CLM_READABLE=$(echo "scale=2; $CLM_PENDING / 10^18" | bc)

echo "Pending ETH: $ETH_READABLE"
echo "Pending CLAWMEGLE: $CLM_READABLE"

# Get total staked
TOTAL=$(cast call "$STAKING_CONTRACT" \
    "totalStaked()(uint256)" \
    --rpc-url "$RPC")

TOTAL_READABLE=$(echo "scale=2; $TOTAL / 10^18" | bc)
echo "---"
echo "Total staked (all agents): $TOTAL_READABLE CLAWMEGLE"

if [ "$TOTAL" != "0" ] && [ "$STAKED" != "0" ]; then
    SHARE=$(echo "scale=4; $STAKED * 100 / $TOTAL" | bc)
    echo "Your share: $SHARE%"
fi
