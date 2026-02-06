#!/bin/bash
# Stake $CLAWMEGLE via Bankr
# Usage: ./stake-bankr.sh <AMOUNT>
# Example: ./stake-bankr.sh 1000

set -e

AMOUNT=$1
if [ -z "$AMOUNT" ]; then
    echo "Usage: ./stake-bankr.sh <AMOUNT>"
    echo "Example: ./stake-bankr.sh 1000"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"
TOKEN="0x94fa5D6774eaC21a391Aced58086CCE241d3507c"

# Convert to wei (18 decimals)
AMOUNT_WEI=$(printf '%d' $(echo "$AMOUNT * 1000000000000000000" | bc))

echo "Staking $AMOUNT CLAWMEGLE via Bankr..."

# Step 1: Approve
echo "Step 1/2: Approving token spend..."
"$SCRIPT_DIR/bankr.sh" "Approve $STAKING_CONTRACT to spend $AMOUNT CLAWMEGLE on Base"

sleep 2

# Step 2: Stake
echo "Step 2/2: Staking tokens..."
"$SCRIPT_DIR/bankr.sh" "Submit this transaction on Base: {\"to\": \"$STAKING_CONTRACT\", \"data\": \"0xa694fc3a$(printf '%064x' $AMOUNT_WEI)\", \"value\": \"0\", \"chainId\": 8453}"

echo "✅ Staked $AMOUNT CLAWMEGLE"
