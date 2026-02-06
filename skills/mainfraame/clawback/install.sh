#!/bin/bash
# ClawBack Installation Script for OpenClaw Skill

set -e

echo "🚀 Installing ClawBack..."
echo "========================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're in an OpenClaw skill directory
if [ -f "$SCRIPT_DIR/SKILL.md" ]; then
    echo "📦 Detected OpenClaw skill installation"
    
    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/bin"
    mkdir -p "$SCRIPT_DIR/scripts"
    
    # Make scripts executable
    chmod +x "$SCRIPT_DIR/setup.sh" "$SCRIPT_DIR/install.sh" 2>/dev/null || true
    
    # Run setup
    echo "Running setup..."
    "$SCRIPT_DIR/setup.sh"
    
    echo ""
    echo "✅ ClawBack skill installed successfully!"
    echo ""
    echo "📋 To use with OpenClaw:"
    echo "   1. The skill will be automatically loaded by OpenClaw"
    echo "   2. Use 'clawback' commands from within OpenClaw"
    echo "   3. Configure via 'clawback setup'"
    
else
    echo "🔧 Standard installation mode"
    
    # Run setup
    "$SCRIPT_DIR/setup.sh"
    
    echo ""
    echo "✅ ClawBack installed successfully!"
    echo ""
    echo "📋 Quick start:"
    echo "   1. Run: clawback setup"
    echo "   2. Follow the interactive wizard"
    echo "   3. Run: clawback run"
fi

echo ""
echo "📚 Documentation:"
echo "   - README.md for general information"
echo "   - SKILL.md for OpenClaw integration"
echo "   - Run 'clawback --help' for CLI usage"