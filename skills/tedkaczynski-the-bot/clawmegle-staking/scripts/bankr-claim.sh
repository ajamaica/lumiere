#!/bin/bash
# Claim rewards via Bankr API
# Usage: ./bankr-claim.sh

STAKING_CONTRACT="${CLAWMEGLE_STAKING:-0x56e687aE55c892cd66018779c416066bc2F5fCf4}"

# claimRewards() = 0x372500ab
CLAIM_DATA="0x372500ab"

echo "Claim rewards:"
echo "Run: scripts/bankr.sh \"Submit this transaction on Base: {\\\"to\\\": \\\"$STAKING_CONTRACT\\\", \\\"data\\\": \\\"$CLAIM_DATA\\\", \\\"value\\\": \\\"0\\\"}\""
