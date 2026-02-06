#!/bin/bash

#######################################
# Ecto Connection Status Script
#######################################

CREDENTIALS_FILE="$HOME/.openclaw/ecto-credentials.json"
GATEWAY_PORT=18789

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🔌 Ecto Connection Status       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check Tailscale
echo -e "${BLUE}Tailscale:${NC}"
if command -v tailscale &> /dev/null; then
    TS_STATUS=$(sudo tailscale status 2>/dev/null || echo "not running")
    if echo "$TS_STATUS" | grep -q "@"; then
        echo -e "  ${GREEN}✓${NC} Connected"
        HOSTNAME=$(sudo tailscale status --json 2>/dev/null | jq -r '.Self.DNSName' | sed 's/\.$//' || echo "unknown")
        echo -e "  ${YELLOW}Hostname:${NC} $HOSTNAME"
    else
        echo -e "  ${RED}✗${NC} Not connected"
    fi
else
    echo -e "  ${RED}✗${NC} Not installed"
fi
echo ""

# Check Funnel
echo -e "${BLUE}Funnel:${NC}"
FUNNEL_STATUS=$(sudo tailscale funnel status 2>/dev/null || echo "not running")
if echo "$FUNNEL_STATUS" | grep -q "https://"; then
    echo -e "  ${GREEN}✓${NC} Enabled"
    FUNNEL_URL=$(echo "$FUNNEL_STATUS" | grep "https://" | head -1 | awk '{print $1}')
    echo -e "  ${YELLOW}URL:${NC} $FUNNEL_URL"
else
    echo -e "  ${RED}✗${NC} Not enabled"
fi
echo ""

# Check Gateway
echo -e "${BLUE}Gateway:${NC}"
GATEWAY_PID=$(pgrep -f "openclaw.*gateway" | head -1 || echo "")
if [ -n "$GATEWAY_PID" ]; then
    echo -e "  ${GREEN}✓${NC} Running (PID: $GATEWAY_PID)"
    
    # Check if responding
    if curl -s "http://localhost:$GATEWAY_PORT/" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Responding on port $GATEWAY_PORT"
    else
        echo -e "  ${YELLOW}!${NC} Port $GATEWAY_PORT not responding"
    fi
else
    echo -e "  ${RED}✗${NC} Not running"
fi
echo ""

# Check Credentials
echo -e "${BLUE}Credentials:${NC}"
if [ -f "$CREDENTIALS_FILE" ]; then
    echo -e "  ${GREEN}✓${NC} Found: $CREDENTIALS_FILE"
    TOKEN=$(jq -r '.token' "$CREDENTIALS_FILE" 2>/dev/null || echo "")
    URL=$(jq -r '.url' "$CREDENTIALS_FILE" 2>/dev/null || echo "")
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo -e "  ${YELLOW}Token:${NC} ${TOKEN:0:8}..."
    fi
    if [ -n "$URL" ] && [ "$URL" != "null" ]; then
        echo -e "  ${YELLOW}URL:${NC} $URL"
    fi
else
    echo -e "  ${RED}✗${NC} Not found"
fi
echo ""

# Test endpoint if everything looks good
if [ -n "$FUNNEL_URL" ] && [ -n "$TOKEN" ]; then
    echo -e "${BLUE}Endpoint Test:${NC}"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$FUNNEL_URL/v1/chat/completions" \
        -d '{"messages":[{"role":"user","content":"ping"}]}' 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "  ${GREEN}✓${NC} Endpoint responding (HTTP $RESPONSE)"
    elif [ "$RESPONSE" = "401" ]; then
        echo -e "  ${YELLOW}!${NC} Auth required (HTTP $RESPONSE) - token may be incorrect"
    elif [ "$RESPONSE" = "000" ]; then
        echo -e "  ${RED}✗${NC} Cannot reach endpoint"
    else
        echo -e "  ${YELLOW}!${NC} HTTP $RESPONSE"
    fi
fi
echo ""
