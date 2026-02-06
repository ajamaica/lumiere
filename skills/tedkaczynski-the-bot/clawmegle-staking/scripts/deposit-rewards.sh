#!/bin/bash
# deposit-rewards.sh - Deposit ETH + CLAWMEGLE rewards to staking contract
# This is the CORRECT way to deposit rewards. Do NOT just stake or transfer!
#
# Usage: ./deposit-rewards.sh <eth_amount> <clawmegle_amount>
# Example: ./deposit-rewards.sh 0.001 100
#
# IMPORTANT: This deposits rewards for stakers to claim.
# It does NOT stake tokens. Use stake.sh for staking.

set -e

STAKING_CONTRACT="0x56e687aE55c892cd66018779c416066bc2F5fCf4"
CLAWMEGLE_TOKEN="0x94fa5D6774eaC21a391Aced58086CCE241d3507c"
BANKR_SCRIPT="$HOME/clawd/skills/bankr/scripts/bankr.sh"

ETH_AMOUNT="${1:-0}"
CLAWMEGLE_AMOUNT="${2:-0}"

if [[ "$ETH_AMOUNT" == "0" && "$CLAWMEGLE_AMOUNT" == "0" ]]; then
    echo "Usage: $0 <eth_amount> <clawmegle_amount>"
    echo "Example: $0 0.001 100"
    echo ""
    echo "At least one amount must be > 0"
    exit 1
fi

echo "=== Deposit Rewards to Clawmegle Staking ==="
echo "ETH: $ETH_AMOUNT"
echo "CLAWMEGLE: $CLAWMEGLE_AMOUNT"
echo "Contract: $STAKING_CONTRACT"
echo ""

# Convert amounts to wei
ETH_WEI=$(python3 -c "print(int(float('$ETH_AMOUNT') * 10**18))")
CLAWMEGLE_WEI=$(python3 -c "print(int(float('$CLAWMEGLE_AMOUNT') * 10**18))")

echo "ETH in wei: $ETH_WEI"
echo "CLAWMEGLE in wei: $CLAWMEGLE_WEI"
echo ""

# Step 1: Approve CLAWMEGLE if amount > 0
if [[ "$CLAWMEGLE_WEI" != "0" ]]; then
    echo "Step 1: Approving CLAWMEGLE..."
    
    # Pad CLAWMEGLE amount to 64 hex chars
    CLAWMEGLE_HEX=$(python3 -c "print(format($CLAWMEGLE_WEI, '064x'))")
    
    # approve(address,uint256) = 0x095ea7b3
    APPROVE_DATA="0x095ea7b3000000000000000000000000${STAKING_CONTRACT:2}${CLAWMEGLE_HEX}"
    
    $BANKR_SCRIPT "Submit this transaction to approve CLAWMEGLE:
{
  \"to\": \"$CLAWMEGLE_TOKEN\",
  \"data\": \"$APPROVE_DATA\",
  \"value\": \"0\",
  \"chainId\": 8453
}"
    
    echo "Approve tx submitted"
    echo ""
fi

# Step 2: Call depositRewards
echo "Step 2: Depositing rewards..."

# Pad CLAWMEGLE amount to 64 hex chars
CLAWMEGLE_HEX=$(python3 -c "print(format($CLAWMEGLE_WEI, '064x'))")

# depositRewards(uint256) = 0x8bdf67f2
DEPOSIT_DATA="0x8bdf67f2${CLAWMEGLE_HEX}"

$BANKR_SCRIPT "Submit this transaction to deposit rewards:
{
  \"to\": \"$STAKING_CONTRACT\",
  \"data\": \"$DEPOSIT_DATA\",
  \"value\": \"$ETH_WEI\",
  \"chainId\": 8453
}"

echo ""
echo "=== Rewards Deposited ==="
echo "Stakers can now claim their proportional share!"
