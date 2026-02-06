#!/bin/bash
# Setup script for sui-knowledge skill
# Clones Sui documentation

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REF_DIR="$SCRIPT_DIR/references"

echo "🚀 Setting up Sui Knowledge skill references..."

mkdir -p "$REF_DIR"
cd "$REF_DIR"

# Clone Sui docs
if [ ! -d "sui-docs" ]; then
    echo "📖 Cloning Sui documentation..."
    git clone --depth 1 --filter=blob:none --sparse https://github.com/MystenLabs/sui.git sui-docs
    cd sui-docs && git sparse-checkout set docs && cd ..
else
    echo "📖 Sui docs already exists, pulling latest..."
    cd sui-docs && git pull && cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Reference location:"
echo "  Sui Docs: $REF_DIR/sui-docs/docs/"
echo ""
echo "Quick search:"
echo "  rg -i 'keyword' $REF_DIR/sui-docs/docs/ --type md"
