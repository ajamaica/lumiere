#!/bin/bash
# AgentOS Mesh - Install/Upgrade Script
# Works for both fresh installs and existing Clawdbot setups

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/clawd/bin"
CONFIG_FILE="${HOME}/.agentos-mesh.json"

echo -e "${BLUE}=== AgentOS Mesh Installer ===${NC}"
echo ""

# Detect existing setup
EXISTING_MESH=""
EXISTING_CONFIG=""

if [ -f "${BIN_DIR}/mesh" ]; then
    EXISTING_MESH="yes"
    echo -e "${YELLOW}⚠ Existing mesh CLI detected at ${BIN_DIR}/mesh${NC}"
fi

if [ -f "${CONFIG_FILE}" ]; then
    EXISTING_CONFIG="yes"
    echo -e "${GREEN}✓ Existing config found at ${CONFIG_FILE}${NC}"
fi

# For existing users: backup and upgrade
if [ "$EXISTING_MESH" = "yes" ]; then
    echo ""
    echo -e "${BLUE}Upgrading existing installation...${NC}"
    
    # Backup old mesh CLI
    cp "${BIN_DIR}/mesh" "${BIN_DIR}/mesh.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${GREEN}✓ Backed up old mesh CLI${NC}"
    
    # Install new mesh CLI
    cp "${SKILL_DIR}/scripts/mesh" "${BIN_DIR}/mesh"
    chmod +x "${BIN_DIR}/mesh"
    echo -e "${GREEN}✓ Installed updated mesh CLI${NC}"
    
else
    # Fresh install
    echo ""
    echo -e "${BLUE}Fresh installation...${NC}"
    
    # Create bin directory if needed
    mkdir -p "${BIN_DIR}"
    
    # Install mesh CLI
    cp "${SKILL_DIR}/scripts/mesh" "${BIN_DIR}/mesh"
    chmod +x "${BIN_DIR}/mesh"
    echo -e "${GREEN}✓ Installed mesh CLI to ${BIN_DIR}/mesh${NC}"
    
    # Add to PATH hint
    if [[ ":$PATH:" != *":${BIN_DIR}:"* ]]; then
        echo ""
        echo -e "${YELLOW}Add to your ~/.bashrc or ~/.zshrc:${NC}"
        echo "  export PATH=\"\${HOME}/clawd/bin:\$PATH\""
    fi
fi

# Config setup
if [ "$EXISTING_CONFIG" != "yes" ]; then
    echo ""
    echo -e "${BLUE}Configuration needed.${NC}"
    echo ""
    echo "Create ${CONFIG_FILE} with:"
    echo ""
    echo '{'
    echo '  "apiUrl": "http://your-server:3100",'
    echo '  "apiKey": "agfs_live_xxx.yyy",'
    echo '  "agentId": "your-agent-id"'
    echo '}'
    echo ""
    echo "Or set environment variables:"
    echo "  AGENTOS_URL, AGENTOS_KEY, AGENTOS_AGENT_ID"
fi

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Commands:"
echo "  mesh status   - Check connection"
echo "  mesh send     - Send message to another agent"
echo "  mesh pending  - View pending messages"
echo "  mesh agents   - List agents on mesh"
echo ""

# Test if config exists and works
if [ -f "${CONFIG_FILE}" ]; then
    echo -e "${BLUE}Testing connection...${NC}"
    if "${BIN_DIR}/mesh" status 2>/dev/null | grep -q "Online"; then
        echo -e "${GREEN}✓ Connected to AgentOS Mesh!${NC}"
    else
        echo -e "${YELLOW}⚠ Could not verify connection. Check your config.${NC}"
    fi
fi
