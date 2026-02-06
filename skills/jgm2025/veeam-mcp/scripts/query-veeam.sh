#!/bin/bash
# Query Veeam via MCP server
# Usage: ./query-veeam.sh <vbr|vone> "your query here"

set -euo pipefail

PRODUCT="${1:-}"
QUERY="${2:-}"

if [[ -z "$PRODUCT" ]] || [[ -z "$QUERY" ]]; then
    echo "Usage: $0 <vbr|vone> \"query\""
    echo ""
    echo "Examples:"
    echo "  $0 vbr \"What backup jobs failed yesterday?\""
    echo "  $0 vone \"Show current alerts\""
    exit 1
fi

# Load credentials
CREDS_FILE="$HOME/.veeam-mcp-creds.json"
if [[ ! -f "$CREDS_FILE" ]]; then
    echo "Error: Credentials file not found: $CREDS_FILE"
    echo "Create it with:"
    echo '{"vbr": {"url": "...", "username": "...", "password": "..."}, "vone": {...}}'
    exit 1
fi

# Extract credentials for the specified product
URL=$(jq -r ".${PRODUCT}.url" "$CREDS_FILE")
USERNAME=$(jq -r ".${PRODUCT}.username" "$CREDS_FILE")
PASSWORD=$(jq -r ".${PRODUCT}.password" "$CREDS_FILE")

if [[ "$URL" == "null" ]] || [[ -z "$URL" ]]; then
    echo "Error: No configuration found for product: $PRODUCT"
    exit 1
fi

# Set product name for MCP
if [[ "$PRODUCT" == "vbr" ]]; then
    PRODUCT_NAME="vbr"
elif [[ "$PRODUCT" == "vone" ]]; then
    PRODUCT_NAME="vone"
else
    echo "Error: Unknown product: $PRODUCT (use vbr or vone)"
    exit 1
fi

# Prepare MCP request (tools/call method with the question)
# Note: The parameter is "question" not "query" per the MCP tool schema
REQUEST=$(jq -n \
    --arg question "$QUERY" \
    '{
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "veeam-question-answering",
            "arguments": {
                "question": $question
            }
        },
        "id": 1
    }')

# Run Docker container with credentials as env vars
echo "$REQUEST" | docker run -i --rm \
    -e "PRODUCT_NAME=$PRODUCT_NAME" \
    -e "WEB_URL=$URL" \
    -e "ADMIN_USERNAME=$USERNAME" \
    -e "ADMIN_PASSWORD=$PASSWORD" \
    -e "ACCEPT_SELF_SIGNED_CERT=true" \
    veeam-intelligence-mcp-server | jq -r '.result.content[0].text // .error.message // "No response"'
