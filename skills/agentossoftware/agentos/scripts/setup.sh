#!/bin/bash
# AgentOS SDK Installer for Clawdbot
# Works for fresh installs and upgrades

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/clawd/bin"
CONFIG_FILE="${HOME}/.agentos.json"

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     AgentOS SDK for Clawdbot          ║${NC}"
echo -e "${BLUE}║     One install. Full access.         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check for upgrade flag
UPGRADE=false
if [[ "$1" == "--upgrade" ]]; then
  UPGRADE=true
fi

# Create bin directory
mkdir -p "$BIN_DIR"

# Check for existing installation
if [ -f "${BIN_DIR}/aos" ]; then
  echo -e "${YELLOW}⚠ Existing installation detected${NC}"
  if [ "$UPGRADE" = true ]; then
    echo "Upgrading..."
  else
    # Backup old CLI
    cp "${BIN_DIR}/aos" "${BIN_DIR}/aos.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${GREEN}✓ Backed up old CLI${NC}"
  fi
fi

# Install CLI
cp "${SKILL_DIR}/scripts/aos" "${BIN_DIR}/aos"
chmod +x "${BIN_DIR}/aos"
echo -e "${GREEN}✓ Installed aos CLI to ${BIN_DIR}/aos${NC}"

# Also install mesh alias for backwards compatibility
if [ -f "${SKILL_DIR}/scripts/mesh" ]; then
  cp "${SKILL_DIR}/scripts/mesh" "${BIN_DIR}/mesh"
  chmod +x "${BIN_DIR}/mesh"
  echo -e "${GREEN}✓ Installed mesh CLI (backwards compat)${NC}"
fi

# Check PATH
if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
  echo ""
  echo -e "${YELLOW}Add to your ~/.bashrc or ~/.zshrc:${NC}"
  echo "  export PATH=\"\${HOME}/clawd/bin:\$PATH\""
fi

# Config check
echo ""
if [ -f "$CONFIG_FILE" ]; then
  echo -e "${GREEN}✓ Config found at $CONFIG_FILE${NC}"
  
  # Validate config
  if jq -e '.apiKey' "$CONFIG_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API key configured${NC}"
  else
    echo -e "${YELLOW}⚠ API key missing - run: aos setup${NC}"
  fi
else
  echo -e "${YELLOW}No config found. Running setup...${NC}"
  echo ""
  "${BIN_DIR}/aos" setup
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Installation Complete!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "Commands:"
echo "  aos status      Check connection"
echo "  aos send        Send message to agent"
echo "  aos inbox       View messages"
echo "  aos sync        Sync memories"
echo "  aos search      Semantic search"
echo "  aos help        Full command list"
echo ""
echo "Dashboard: https://brain.agentos.software"
echo ""

# Quick status check
echo -e "${BLUE}Testing connection...${NC}"
"${BIN_DIR}/aos" status 2>/dev/null || echo -e "${YELLOW}Run 'aos setup' to configure${NC}"
