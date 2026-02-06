#!/bin/bash
# MolTunes CLI setup script

# Check if molt CLI is installed
if ! command -v molt &> /dev/null; then
    echo "Installing molt CLI..."
    npm install -g molt-cli 2>/dev/null || npm install -g moltunes-cli 2>/dev/null
fi

echo "molt CLI ready!"

# If not registered yet, prompt registration
if [ ! -f ~/.moltrc ]; then
    echo ""
    echo "No MolTunes identity found. Run 'molt register' to create one."
fi
