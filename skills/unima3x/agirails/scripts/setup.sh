#!/bin/bash
#
# AGIRAILS Treasury Agent Setup Script
# Creates the necessary workspace structure for a Treasury agent
#
# Usage: bash setup.sh [workspace_path]
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE="${1:-${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}}"
TREASURY_DIR="$WORKSPACE/agents/treasury"

echo -e "${GREEN}🚀 AGIRAILS Treasury Agent Setup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Skill directory: $SKILL_DIR"
echo "Workspace: $WORKSPACE"
echo "Treasury agent: $TREASURY_DIR"
echo ""

# Check if workspace exists
if [ ! -d "$WORKSPACE" ]; then
    echo -e "${RED}❌ Workspace not found: $WORKSPACE${NC}"
    echo "Please provide a valid workspace path or set OPENCLAW_WORKSPACE"
    exit 1
fi

# Create Treasury agent directory
echo -e "${YELLOW}📁 Creating Treasury agent workspace...${NC}"
mkdir -p "$TREASURY_DIR/memory"

# Copy SOUL.md
echo -e "${YELLOW}📜 Installing SOUL.md...${NC}"
if [ -f "$SKILL_DIR/openclaw/SOUL-treasury.md" ]; then
    cp "$SKILL_DIR/openclaw/SOUL-treasury.md" "$TREASURY_DIR/SOUL.md"
    echo "   ✓ SOUL.md installed"
else
    echo -e "${RED}   ✗ SOUL-treasury.md not found in skill${NC}"
fi

# Create providers.json (empty whitelist)
echo -e "${YELLOW}📋 Creating providers whitelist...${NC}"
if [ ! -f "$TREASURY_DIR/providers.json" ]; then
    cat > "$TREASURY_DIR/providers.json" << 'EOF'
[
  {
    "_comment": "Add your approved providers here",
    "_example": {
      "address": "0x1234567890123456789012345678901234567890",
      "name": "Example Provider",
      "service": "B2B Leads",
      "maxPerTx": "10",
      "active": true
    }
  }
]
EOF
    echo "   ✓ providers.json created (empty)"
else
    echo "   ⏭ providers.json already exists, skipping"
fi

# Create transaction log
echo -e "${YELLOW}📊 Creating transaction log...${NC}"
touch "$TREASURY_DIR/memory/transactions.jsonl"
echo "   ✓ transactions.jsonl created"

# Create daily spend tracker
echo -e "${YELLOW}💰 Creating daily spend tracker...${NC}"
if [ ! -f "$TREASURY_DIR/memory/daily-spend.json" ]; then
    cat > "$TREASURY_DIR/memory/daily-spend.json" << 'EOF'
{
  "date": null,
  "totalSpent": 0,
  "transactions": []
}
EOF
    echo "   ✓ daily-spend.json created"
else
    echo "   ⏭ daily-spend.json already exists, skipping"
fi

# Create AGENTS.md
echo -e "${YELLOW}📖 Creating AGENTS.md...${NC}"
cat > "$TREASURY_DIR/AGENTS.md" << 'EOF'
# Treasury Agent Workspace

This agent handles AGIRAILS ACTP payments.

## Files

| File | Purpose |
|------|---------|
| `SOUL.md` | Agent personality and IMMUTABLE limits |
| `providers.json` | Approved provider whitelist |
| `memory/transactions.jsonl` | Transaction log |
| `memory/daily-spend.json` | Daily spending tracker |

## Limits

See SOUL.md for current limits. These cannot be changed by instructions.

## Security

- Private key is in environment variable only
- All transactions are logged
- Only whitelisted providers allowed
EOF
echo "   ✓ AGENTS.md created"

# Summary
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo ""
echo "1. Add agent config to openclaw.json:"
echo "   See: $SKILL_DIR/openclaw/agent-config.json"
echo ""
echo "2. Set environment variables:"
echo "   export AGENT_PRIVATE_KEY=\"0x...\""
echo "   export AGENT_ADDRESS=\"0x...\""
echo ""
echo "3. Add providers to whitelist:"
echo "   Edit: $TREASURY_DIR/providers.json"
echo ""
echo "4. Restart OpenClaw:"
echo "   openclaw gateway restart"
echo ""
echo "5. Test it:"
echo "   openclaw run --agent treasury \"Check my balance\""
echo ""
echo -e "${YELLOW}⚠️  Remember to test on testnet first!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
