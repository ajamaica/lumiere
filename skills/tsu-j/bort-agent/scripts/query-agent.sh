#!/bin/bash
# Query a BORT agent's on-chain state from the BAP-578 contract on BNB Chain.
#
# Usage: query-agent.sh <agentId>
#
# Arguments:
#   agentId - BORT agent token ID (integer)
#
# Environment:
#   BNB_RPC_URL - BNB Smart Chain RPC endpoint (default: https://bsc-dataseed.binance.org/)
#
# Returns JSON with: owner, status, logicAddress, balance, lastActionTimestamp, agentType

set -euo pipefail

RPC_URL="${BNB_RPC_URL:-https://bsc-dataseed.binance.org/}"
AGENT_ID="${1:?Usage: query-agent.sh <agentId>}"
BAP578_CONTRACT="0x15b15df2ffff6653c21c11b93fb8a7718ce854ce"

# getState(uint256) function selector: 0x44c9af28
# keccak256("getState(uint256)") = 0x44c9af28...
SELECTOR="0x44c9af28"

# Encode the token ID as a 32-byte hex value
TOKEN_HEX=$(printf '%064x' "$AGENT_ID")
CALLDATA="${SELECTOR}${TOKEN_HEX}"

# If cast (Foundry) is available, use it for cleaner output
if command -v cast &> /dev/null; then
  RESULT=$(cast call "$BAP578_CONTRACT" \
    "getState(uint256)(uint256,uint8,address,address,uint256)" \
    "$AGENT_ID" \
    --rpc-url "$RPC_URL" 2>&1)

  if [ $? -eq 0 ]; then
    BALANCE=$(echo "$RESULT" | sed -n '1p')
    STATUS=$(echo "$RESULT" | sed -n '2p')
    OWNER=$(echo "$RESULT" | sed -n '3p')
    LOGIC=$(echo "$RESULT" | sed -n '4p')
    LAST_ACTION=$(echo "$RESULT" | sed -n '5p')
  else
    echo "Error: Failed to query agent $AGENT_ID - $RESULT" >&2
    exit 1
  fi
else
  # Fallback: raw JSON-RPC call via curl
  RESPONSE=$(curl -s -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"method\": \"eth_call\",
      \"params\": [{
        \"to\": \"$BAP578_CONTRACT\",
        \"data\": \"$CALLDATA\"
      }, \"latest\"],
      \"id\": 1
    }" 2>&1)

  # Check for RPC error
  ERROR=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('message',''))" 2>/dev/null || echo "")
  if [ -n "$ERROR" ]; then
    echo "Error: RPC call failed - $ERROR" >&2
    exit 1
  fi

  # Parse the hex result
  # getState returns: (uint256 balance, uint8 status, address owner, address logicAddress, uint256 lastActionTimestamp)
  # ABI-encoded as 5 x 32-byte words
  HEX_RESULT=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('result','0x'))" 2>/dev/null)

  if [ "$HEX_RESULT" = "0x" ] || [ -z "$HEX_RESULT" ]; then
    echo "Error: Agent $AGENT_ID does not exist on-chain" >&2
    exit 1
  fi

  # Strip 0x prefix and split into 64-char (32-byte) words
  RAW="${HEX_RESULT#0x}"
  WORD1="${RAW:0:64}"    # balance
  WORD2="${RAW:64:64}"   # status
  WORD3="${RAW:128:64}"  # owner
  WORD4="${RAW:192:64}"  # logicAddress
  WORD5="${RAW:256:64}"  # lastActionTimestamp

  BALANCE=$((16#${WORD1}))
  STATUS=$((16#${WORD2}))
  OWNER="0x${WORD3:24:40}"
  LOGIC="0x${WORD4:24:40}"
  LAST_ACTION=$((16#${WORD5}))
fi

# Map logic address to agent type
LOGIC_LOWER=$(echo "$LOGIC" | tr '[:upper:]' '[:lower:]')
case "$LOGIC_LOWER" in
  "0x9eb431f7df06c561af5dd02d24fa806dd7f51211") AGENT_TYPE="Basic Agent" ;;
  "0x17affcd99dea21a5696a8ec07cb35c2d3d63c25e") AGENT_TYPE="Trading Agent" ;;
  "0xd9a131d5ee901f019d99260d14dc2059c5bddac0") AGENT_TYPE="Security Agent" ;;
  "0x5cba71e6976440f5bab335e7199ca6f3fb0dc464") AGENT_TYPE="DAO Agent" ;;
  "0x4dd93c9abfb577d926c0c1f76d09b122fe967b36") AGENT_TYPE="Creator Agent" ;;
  "0xbee7ff1de98a7eb38b537c139e2af64073e1bfbf") AGENT_TYPE="Game Agent" ;;
  "0x05c3eb90294d709a6fe128a9f0830cdaa1ed22a2") AGENT_TYPE="Strategic Agent" ;;
  "0x7572f5ffbe7f0da6935be42cd2573c743a8d7b5f") AGENT_TYPE="Social Media Agent" ;;
  "0x0c7b91ce0ee1a9504db62c7327ff8aa8f6abfd36") AGENT_TYPE="Oracle Data Agent" ;;
  "0x02fe5764632b788380fc07bae10bb27eebbd2552") AGENT_TYPE="NFT Marketplace Agent" ;;
  *) AGENT_TYPE="Custom Agent" ;;
esac

# Map status code to name
case "$STATUS" in
  0) STATUS_NAME="Paused" ;;
  1) STATUS_NAME="Active" ;;
  2) STATUS_NAME="Terminated" ;;
  *) STATUS_NAME="Unknown" ;;
esac

# Output as JSON
cat <<EOF
{
  "agentId": $AGENT_ID,
  "owner": "$OWNER",
  "status": $STATUS,
  "statusName": "$STATUS_NAME",
  "logicAddress": "$LOGIC",
  "agentType": "$AGENT_TYPE",
  "balance": "$BALANCE",
  "lastActionTimestamp": $LAST_ACTION,
  "contract": "$BAP578_CONTRACT",
  "chain": "BNB Smart Chain",
  "chainId": 56
}
EOF
