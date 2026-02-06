#!/bin/bash
# Stake via Bankr API
# Usage: ./bankr-stake.sh <AMOUNT>
# Example: ./bankr-stake.sh 1000

set -e

AMOUNT=$1
if [ -z "$AMOUNT" ]; then
    echo "Usage: ./bankr-stake.sh <AMOUNT>"
    exit 1
fi

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
TOKEN="0x94fa5D6774eaC21a391Aced58086CCE241d3507c"

# Convert to wei
AMOUNT_WEI=$(printf "0x%x" $(echo "$AMOUNT * 10^18 / 1" | bc))

# Generate approve calldata
# approve(address,uint256) = 0x095ea7b3
APPROVE_DATA="0x095ea7b3$(printf '%064s' "${STAKING_CONTRACT:2}" | tr ' ' '0')$(printf '%064s' "${AMOUNT_WEI:2}" | tr ' ' '0')"

# Generate stake calldata  
# stake(uint256) = 0xa694fc3a
STAKE_DATA="0xa694fc3a$(printf '%064s' "${AMOUNT_WEI:2}" | tr ' ' '0')"

echo "Step 1: Approve tokens"
echo "Run: scripts/bankr.sh \"Submit this transaction on Base: {\\\"to\\\": \\\"$TOKEN\\\", \\\"data\\\": \\\"$APPROVE_DATA\\\", \\\"value\\\": \\\"0\\\"}\""
echo ""
echo "Step 2: Stake tokens"
echo "Run: scripts/bankr.sh \"Submit this transaction on Base: {\\\"to\\\": \\\"$STAKING_CONTRACT\\\", \\\"data\\\": \\\"$STAKE_DATA\\\", \\\"value\\\": \\\"0\\\"}\""
