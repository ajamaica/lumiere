#!/bin/bash
# One-line installer for Vector Memory
# Usage: curl -sL https://raw.githubusercontent.com/YOUR_USERNAME/vector-memory-openclaw/main/install.sh | bash

set -e

echo "🧠 Installing Vector Memory for OpenClaw..."
echo ""

# Detect OpenClaw workspace
if [ -d "$HOME/.openclaw/workspace" ]; then
    WORKSPACE="$HOME/.openclaw/workspace"
elif [ -d "/config/.openclaw/workspace" ]; then
    WORKSPACE="/config/.openclaw/workspace"
else
    echo "❌ Could not find OpenClaw workspace"
    echo "Please run from your OpenClaw workspace directory"
    exit 1
fi

echo "📁 Found workspace: $WORKSPACE"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION found. Please upgrade to 18+"
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo ""

# Clone or download
echo "📥 Downloading Vector Memory..."
REPO_URL="https://github.com/YOUR_USERNAME/vector-memory-openclaw"

if command -v git &> /dev/null; then
    # Git available - clone
    cd /tmp
    rm -rf vector-memory-temp 2>/dev/null || true
    git clone --depth 1 "$REPO_URL.git" vector-memory-temp
    
    # Copy files
    cp -r vector-memory-temp/skills/vector-memory "$WORKSPACE/skills/"
    cp -r vector-memory-temp/vector-memory "$WORKSPACE/"
    rm -rf vector-memory-temp
else
    # No git - download tarball
    cd /tmp
    curl -L "$REPO_URL/archive/main.tar.gz" | tar xz
    cp -r vector-memory-openclaw-main/skills/vector-memory "$WORKSPACE/skills/"
    cp -r vector-memory-openclaw-main/vector-memory "$WORKSPACE/"
    rm -rf vector-memory-openclaw-main
fi

echo "✅ Files installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd "$WORKSPACE/vector-memory"
npm install --silent

echo "✅ Dependencies installed"
echo ""

# Initial sync
echo "🔄 Indexing memory files..."
node vector_memory_local.js --sync

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Quick test:"
echo "  node vector-memory/vector_memory_local.js --search 'test query'"
echo ""
echo "To use in OpenClaw, the skill is already configured."
echo "The memory_search tool now uses vector embeddings!"