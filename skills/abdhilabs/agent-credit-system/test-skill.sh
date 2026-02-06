#!/bin/bash
# KarmaBank Skill Test Script

set -e

echo "========================================"
echo "  KarmaBank Skill Test Suite"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run tests
echo ""
echo "Running tests..."
npm test

echo ""
echo "========================================"
echo "  Test Complete!"
echo "========================================"
