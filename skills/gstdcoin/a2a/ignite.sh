#!/bin/bash
# GSTD Agent Ignite Script - One-click startup
# Version: 1.2.0

# Colors for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}🚀 GSTD Autonomous Agent: Ignition Sequence${NC}\n"

# 1. Environment Setup
if [ ! -d "venv" ]; then
    echo -e "📦 Creating virtual environment..."
    python3 -m venv venv || { echo -e "${RED}❌ Failed to create venv. Is python3-venv installed?${NC}"; exit 1; }
fi

source venv/bin/bin/activate 2>/dev/null || source venv/bin/activate

# 2. Dependency Management
echo -e "🔗 Checking dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -e .

# 3. Identity Verification
if [ -f ".env" ]; then
    source .env
fi

if [ -z "$GSTD_WALLET_ADDRESS" ] && [ -z "$AGENT_PRIVATE_MNEMONIC" ]; then
    echo -e "${RED}⚠️  No wallet configuration found in .env${NC}"
    echo -e "   You can run: ${BOLD}python3 verify_deployment.py${NC} to generate one."
    echo -e "   Starting in ${BOLD}Anonymous Mode${NC} (Read-only / Simulated)..."
fi

# 4. Launch
echo -e "\n${GREEN}${BOLD}✅ Agent is ready!${NC}"
echo -e "🛠️  Starting MCP Server (Standard IO Mode)..."
echo -e "-------------------------------------------"

# Launch the MCP server using the entry point defined in setup.py
python3 -m gstd_a2a.mcp_server
