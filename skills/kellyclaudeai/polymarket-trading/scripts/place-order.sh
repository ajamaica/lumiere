#!/bin/bash
# Place orders on Polymarket

set -e

# Load credentials
if [[ -f ~/.config/polymarket/credentials.json ]]; then
  PRIVATE_KEY=$(jq -r '.privateKey' ~/.config/polymarket/credentials.json)
  API_KEY=$(jq -r '.apiKey' ~/.config/polymarket/credentials.json)
  API_SECRET=$(jq -r '.apiSecret' ~/.config/polymarket/credentials.json)
elif [[ -n "$POLYMARKET_PRIVATE_KEY" ]]; then
  PRIVATE_KEY="$POLYMARKET_PRIVATE_KEY"
  API_KEY="$POLYMARKET_API_KEY"
  API_SECRET="$POLYMARKET_API_SECRET"
else
  echo "Error: No credentials found"
  echo "Set up ~/.config/polymarket/credentials.json or environment variables"
  exit 1
fi

# Parse arguments
MARKET=""
SIDE=""
OUTCOME=""
AMOUNT=""
PRICE=""
TYPE="limit"

while [[ $# -gt 0 ]]; do
  case $1 in
    --market) MARKET="$2"; shift 2 ;;
    --side) SIDE="$2"; shift 2 ;;
    --outcome) OUTCOME="$2"; shift 2 ;;
    --amount) AMOUNT="$2"; shift 2 ;;
    --price) PRICE="$2"; shift 2 ;;
    --type) TYPE="$2"; shift 2 ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [[ -z "$MARKET" || -z "$SIDE" || -z "$OUTCOME" || -z "$AMOUNT" ]]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 --market <id> --side <buy|sell> --outcome <yes|no> --amount <usd>"
  exit 1
fi

# Validate price for limit orders
if [[ "$TYPE" == "limit" && -z "$PRICE" ]]; then
  echo "Error: --price required for limit orders"
  exit 1
fi

# Convert outcome to token ID
if [[ "$OUTCOME" == "yes" ]]; then
  TOKEN_ID="0"
else
  TOKEN_ID="1"
fi

# Build order payload
ORDER_PAYLOAD=$(cat <<EOF
{
  "market": "$MARKET",
  "side": "$SIDE",
  "tokenId": "$TOKEN_ID",
  "amount": "$AMOUNT",
  "price": "$PRICE",
  "type": "$TYPE",
  "timestamp": $(date +%s)
}
EOF
)

echo "Placing order..."
echo "Market: $MARKET"
echo "Side: $SIDE $OUTCOME"
echo "Amount: \$$AMOUNT"
echo "Price: $PRICE"
echo ""

# Sign and submit order (simplified - real implementation would use Web3)
# This is a placeholder for the actual signing logic
echo "$ORDER_PAYLOAD" | jq '.'

# In production, you would:
# 1. Sign the order with private key
# 2. POST to https://clob.polymarket.com/orders
# 3. Include API key in headers
# 4. Return order ID and status

SIGNATURE="0x..." # Placeholder

RESPONSE=$(curl -s -X POST "https://clob.polymarket.com/orders" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"order\": $ORDER_PAYLOAD,
    \"signature\": \"$SIGNATURE\"
  }")

echo ""
echo "Response:"
echo "$RESPONSE" | jq '.'

ORDER_ID=$(echo "$RESPONSE" | jq -r '.orderId')

if [[ -n "$ORDER_ID" && "$ORDER_ID" != "null" ]]; then
  echo ""
  echo "✅ Order placed successfully!"
  echo "Order ID: $ORDER_ID"
else
  echo ""
  echo "❌ Order failed"
  exit 1
fi
