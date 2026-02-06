#!/bin/bash
# Start interactive MCP server session
# Usage: ./start-mcp.sh <vbr|vone>

set -euo pipefail

PRODUCT="${1:-vbr}"

# Load credentials
CREDS_FILE="$HOME/.veeam-mcp-creds.json"
if [[ ! -f "$CREDS_FILE" ]]; then
    echo "Error: Credentials file not found: $CREDS_FILE"
    exit 1
fi

URL=$(jq -r ".${PRODUCT}.url" "$CREDS_FILE")
USERNAME=$(jq -r ".${PRODUCT}.username" "$CREDS_FILE")
PASSWORD=$(jq -r ".${PRODUCT}.password" "$CREDS_FILE")

if [[ "$URL" == "null" ]]; then
    echo "Error: No configuration for: $PRODUCT"
    exit 1
fi

echo "Starting MCP server for $PRODUCT at $URL..."
echo "Send JSON-RPC requests via stdin. Ctrl+D to exit."
echo ""

docker run -i --rm \
    -e "PRODUCT_NAME=$PRODUCT" \
    -e "WEB_URL=$URL" \
    -e "ADMIN_USERNAME=$USERNAME" \
    -e "ADMIN_PASSWORD=$PASSWORD" \
    -e "ACCEPT_SELF_SIGNED_CERT=true" \
    veeam-intelligence-mcp-server
