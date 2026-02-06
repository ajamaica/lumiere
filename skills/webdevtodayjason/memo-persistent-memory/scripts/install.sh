#!/bin/bash
# OpenClaw Persistent Memory - Install Script
# Installs npm package, sets up extension, and configures OpenClaw

set -e

echo "🧠 Installing OpenClaw Persistent Memory..."

# 1. Install npm package
echo "📦 Installing npm package..."
npm install -g openclaw-persistent-memory

# 2. Get package location
PKG_PATH=$(npm root -g)/openclaw-persistent-memory

# 3. Create extension directory
EXTENSION_DIR="$HOME/.openclaw/extensions/openclaw-mem"
echo "📁 Setting up extension at $EXTENSION_DIR..."
mkdir -p "$EXTENSION_DIR"

# 4. Copy extension files
cp "$PKG_PATH/extension/index.ts" "$EXTENSION_DIR/"
cp "$PKG_PATH/extension/openclaw.plugin.json" "$EXTENSION_DIR/"
cp "$PKG_PATH/extension/package.json" "$EXTENSION_DIR/"

# 5. Install extension dependencies
echo "📥 Installing extension dependencies..."
cd "$EXTENSION_DIR" && npm install

# 6. Check if openclaw.json exists
CONFIG_FILE="$HOME/.openclaw/openclaw.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "⚙️  OpenClaw config found at $CONFIG_FILE"
    echo ""
    echo "Add this to your plugins config:"
    echo '  "plugins": {'
    echo '    "slots": { "memory": "openclaw-mem" },'
    echo '    "allow": ["openclaw-mem"],'
    echo '    "entries": {'
    echo '      "openclaw-mem": {'
    echo '        "enabled": true,'
    echo '        "config": {'
    echo '          "workerUrl": "http://127.0.0.1:37778",'
    echo '          "autoCapture": true,'
    echo '          "autoRecall": true'
    echo '        }'
    echo '      }'
    echo '    }'
    echo '  }'
else
    echo "⚠️  No OpenClaw config found. Run 'openclaw configure' first."
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Start the worker:  openclaw-persistent-memory start"
echo "  2. Update openclaw.json with the config above"
echo "  3. Restart gateway:   openclaw gateway restart"
echo ""
echo "Test it:"
echo "  curl http://127.0.0.1:37778/api/health"
