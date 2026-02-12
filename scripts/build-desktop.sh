#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Build Lumiere as a Desktop App (Electron)
#
# Usage:  pnpm build:desktop
#
# Steps:
#   1. Run the Expo web export → dist/
#   2. Package with electron-builder for the current platform
# ─────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

echo "==> Building Expo web export..."
npx expo export --platform web

echo "==> Packaging desktop app with electron-builder..."
npx electron-builder --config electron-builder.config.js

echo ""
echo "==> Desktop build complete! Check the desktop-dist/ directory."
