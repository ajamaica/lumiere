#!/bin/bash
# Check staked balance
# Usage: ./balance.sh [ADDRESS]

set -e

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
RPC="https://mainnet.base.org"

ADDRESS=$1

if [ -z "$ADDRESS" ]; then
    if [ -z "$PRIVATE_KEY" ]; then
        echo "Usage: ./balance.sh <ADDRESS>"
        exit 1
    fi
    ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY")
fi

STAKED=$(cast call "$STAKING_CONTRACT" \
    "getStakedAmount(address)(uint256)" "$ADDRESS" \
    --rpc-url "$RPC")

STAKED_READABLE=$(echo "scale=2; $STAKED / 10^18" | bc)
echo "$STAKED_READABLE"
