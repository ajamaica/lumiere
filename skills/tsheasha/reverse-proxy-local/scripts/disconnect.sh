#!/bin/bash

#######################################
# Ecto Connection Disconnect Script
#######################################

GATEWAY_PORT=18789

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🔌 Ecto Connection Disconnect     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Disable Funnel
echo -e "${BLUE}==>${NC} Disabling Tailscale Funnel..."
sudo tailscale funnel --https=443 off 2>/dev/null || true
sudo tailscale serve reset 2>/dev/null || true
echo -e "${GREEN}✓${NC} Funnel disabled"

# Optionally stop gateway (commented out by default)
# echo -e "${BLUE}==>${NC} Stopping gateway..."
# pkill -9 -f "openclaw.*gateway" 2>/dev/null || true
# echo -e "${GREEN}✓${NC} Gateway stopped"

echo ""
echo -e "${GREEN}Ecto connection disabled.${NC}"
echo ""
echo "The gateway is still running locally."
echo "To fully stop: pkill -9 -f 'openclaw.*gateway'"
echo ""
echo "To reconnect later:"
echo "  ~/.openclaw/workspace/skills/ecto-connection/scripts/connect.sh"
echo ""
