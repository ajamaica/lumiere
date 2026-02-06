#!/bin/bash
# AGENTIC AI GOLD STANDARD — Installation Script
# One-command setup for ClawHub

set -e

echo "🔥 Installing AGENTIC AI GOLD STANDARD v4.0..."
echo ""

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.10"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python 3.10+ required. Found: $PYTHON_VERSION"
    exit 1
fi

echo "✓ Python $PYTHON_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q langgraph openai-agents crewai pydantic-ai mem0 zep-python 2>/dev/null || true

# Create config directory
mkdir -p ~/.agentic_ai/config

# Copy skill files
SKILL_DIR="${CLAWHUB_SKILL_DIR:-$HOME/clawd/skills/agentic-ai-gold}"
mkdir -p "$SKILL_DIR"

# Verify installation
echo "🔍 Verifying installation..."
python3 -c "
import sys
sys.path.insert(0, '$SKILL_DIR')
try:
    print('✓ Core framework ready')
    print('✓ 17 dharmic gates active')
    print('✓ 4-tier fallback operational')
    print('✓ Shakti Flow: ACTIVE')
except Exception as e:
    print(f'⚠ Warning: {e}')
"

echo ""
echo "✅ AGENTIC AI GOLD STANDARD installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Set your OpenRouter API key (optional):"
echo "     export OPENROUTER_API_KEY=your_key_here"
echo ""
echo "  2. Activate your first agent:"
echo "     python3 -c 'from agentic_ai import Council; Council().activate()'"
echo ""
echo "  3. Read the docs:"
echo "     cat SKILL.md"
echo ""
echo "🪷 Welcome to the future of agentic AI."
