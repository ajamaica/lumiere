#!/bin/bash
set -e

#######################################
# Ecto Connection Test Script
# For friends who received credentials
#######################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check for credentials file
CREDS_FILE="${1:-ecto-credentials.json}"

if [ ! -f "$CREDS_FILE" ]; then
    echo -e "${RED}Error:${NC} Credentials file not found: $CREDS_FILE"
    echo ""
    echo "Usage: $0 [path-to-credentials.json]"
    echo ""
    echo "Ask your friend to share their ecto-credentials.json file with you."
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error:${NC} jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

# Load credentials
URL=$(jq -r '.url' "$CREDS_FILE")
TOKEN=$(jq -r '.token' "$CREDS_FILE")

if [ -z "$URL" ] || [ "$URL" = "null" ]; then
    echo -e "${RED}Error:${NC} Invalid credentials file (missing URL)"
    exit 1
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}Error:${NC} Invalid credentials file (missing token)"
    exit 1
fi

echo -e "${BLUE}Testing connection to OpenClaw API...${NC}"
echo ""
echo -e "  URL: ${GREEN}$URL${NC}"
echo ""

# Make test request
RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/v1/chat/completions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello! Please respond with a short greeting."}]}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Connection successful!${NC}"
    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | jq -r '.choices[0].message.content' 2>/dev/null || echo "$BODY"
    echo ""
else
    echo -e "${RED}✗ Connection failed${NC}"
    echo -e "HTTP Status: $HTTP_CODE"
    echo ""
    echo -e "${BLUE}Response:${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    exit 1
fi
