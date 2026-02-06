#!/bin/bash
# Install multi-agent mesh scripts to ~/.local/bin/

set -e

BIN_DIR="$HOME/.local/bin"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🦊 Installing Jasper Recall Multi-Agent Mesh..."
echo ""

# Ensure bin directory exists
mkdir -p "$BIN_DIR"

# Install scripts
echo "Installing recall-mesh..."
cp "$SCRIPT_DIR/recall-mesh" "$BIN_DIR/recall-mesh"
chmod +x "$BIN_DIR/recall-mesh"

echo "Installing index-digests-mesh..."
cp "$SCRIPT_DIR/index-digests-mesh" "$BIN_DIR/index-digests-mesh"
chmod +x "$BIN_DIR/index-digests-mesh"

echo ""
echo "✓ Multi-agent mesh installed!"
echo ""
echo "Usage:"
echo "  recall-mesh \"query\" --agent sonnet"
echo "  recall-mesh \"query\" --mesh sonnet,qwen,opus"
echo "  index-digests-mesh --agent sonnet"
echo ""
echo "Docs: ~/projects/jasper-recall/docs/MULTI-AGENT-MESH.md"
