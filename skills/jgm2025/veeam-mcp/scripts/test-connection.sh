#!/bin/bash
# Test connection to Veeam MCP server
# Usage: ./test-connection.sh <vbr|vone>

set -euo pipefail

PRODUCT="${1:-vbr}"

# Load credentials
CREDS_FILE="$HOME/.veeam-mcp-creds.json"
if [[ ! -f "$CREDS_FILE" ]]; then
    echo "❌ Credentials file not found: $CREDS_FILE"
    exit 1
fi

URL=$(jq -r ".${PRODUCT}.url" "$CREDS_FILE")
USERNAME=$(jq -r ".${PRODUCT}.username" "$CREDS_FILE")
PASSWORD=$(jq -r ".${PRODUCT}.password" "$CREDS_FILE")

if [[ "$URL" == "null" ]]; then
    echo "❌ No configuration for product: $PRODUCT"
    exit 1
fi

echo "Testing connection to $PRODUCT at $URL..."

# Send initialize request
INIT_REQUEST='{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}'

RESPONSE=$(echo "$INIT_REQUEST" | docker run -i --rm \
    -e "PRODUCT_NAME=$PRODUCT" \
    -e "WEB_URL=$URL" \
    -e "ADMIN_USERNAME=$USERNAME" \
    -e "ADMIN_PASSWORD=$PASSWORD" \
    -e "ACCEPT_SELF_SIGNED_CERT=true" \
    veeam-intelligence-mcp-server 2>&1)

if echo "$RESPONSE" | jq -e '.result.serverInfo' > /dev/null 2>&1; then
    echo "✅ Connection successful!"
    echo ""
    echo "Server Info:"
    echo "$RESPONSE" | jq '.result.serverInfo'
else
    echo "❌ Connection failed"
    echo ""
    echo "Response:"
    echo "$RESPONSE"
    exit 1
fi
