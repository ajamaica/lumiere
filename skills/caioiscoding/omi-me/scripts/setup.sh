#!/bin/bash
# Setup script for Omi.me skill
# Run: bash /home/ubuntu/.openclaw/workspace/skills/omi-me/scripts/setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$HOME/.config/omi-me"
TOKEN_FILE="$CONFIG_DIR/token"

echo "🧠 Setting up Omi.me skill..."

# Create config directory
mkdir -p "$CONFIG_DIR"

# Check for existing token
if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
    echo "✓ Token already configured"
else
    echo ""
    echo "⚠️  OMI_API_TOKEN not found!"
    echo ""
    echo "To configure, run:"
    echo "  bash $SCRIPT_DIR/omi-token.sh set"
    echo ""
    echo "Or manually:"
    echo "  echo 'your-token' > $TOKEN_FILE"
    echo ""
    echo "Get your token from: https://docs.omi.me/doc/developer/api/overview"
    echo ""
fi

# Also check environment variable
if [ -n "$OMI_API_TOKEN" ] && [ ! -f "$TOKEN_FILE" ]; then
    echo "✓ Using OMI_API_TOKEN from environment"
    echo "$OMI_API_TOKEN" > "$TOKEN_FILE"
fi

# Make scripts executable
chmod +x "$SCRIPT_DIR/omi-cli.sh"
chmod +x "$SCRIPT_DIR/omi-token.sh"

# Optional: Create symlinks
if [ -d /usr/local/bin ]; then
    ln -sf "$SCRIPT_DIR/omi-cli.sh" /usr/local/bin/omi 2>/dev/null || true
    ln -sf "$SCRIPT_DIR/omi-token.sh" /usr/local/bin/omi-token 2>/dev/null || true
    echo "✓ Symlinks created: /usr/local/bin/omi, /usr/local/bin/omi-token"
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install with: sudo apt install jq"
fi

# Create _meta.json for OpenClaw skill registration
META_FILE="$SKILL_DIR/_meta.json"
if [ ! -f "$META_FILE" ]; then
    cat > "$META_FILE" << 'EOF'
{
  "slug": "omi-me",
  "version": "1.0.0"
}
EOF
    echo "✓ _meta.json created"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  omi-token.sh set              # Configure API token"
echo "  omi-token.sh test             # Test connection"
echo "  omi memories list"
echo "  omi tasks create \"My task\""
echo "  omi sync memories"
echo ""
echo "Or use the CLI commands directly"
