#!/bin/bash
set -e

echo "=== Basecamp CLI v2.0.0 Release ==="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v npm &>/dev/null; then
	echo "ERROR: npm not found"
	exit 1
fi

if ! command -v gh &>/dev/null; then
	echo "WARNING: gh (GitHub CLI) not found - manual release creation needed"
fi

# Verify build
echo "Building..."
bun run build

# Verify tests (if configured)
echo "Running tests..."
bun test || echo "Tests skipped or failed - review before publishing"

# Show package contents
echo ""
echo "Package contents:"
npm pack --dry-run

# Confirm
echo ""
read -p "Ready to publish? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
	echo "Aborted."
	exit 1
fi

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push origin main

# Publish to npm
echo ""
echo "Publishing to npm..."
npm publish --access public

# Create GitHub release
echo ""
echo "Creating GitHub release..."
if command -v gh &>/dev/null; then
	gh release create v2.0.0 --title "v2.0.0" --notes-file CHANGELOG.md
else
	echo "Create release manually at: https://github.com/drkraft/basecamp-cli/releases/new"
fi

echo ""
echo "=== Release complete! ==="
echo ""
echo "Next steps:"
echo "1. Verify on npm: https://www.npmjs.com/package/@drkraft/basecamp-cli"
echo "2. Verify on GitHub: https://github.com/drkraft/basecamp-cli"
echo "3. Submit to ClawHub (manual)"
