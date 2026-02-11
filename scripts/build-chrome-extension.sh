#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Build Lumiere as a Chrome Extension (Manifest V3)
#
# Usage:  pnpm build:chrome
#
# Steps:
#   1. Run the Expo web export → dist/
#   2. Copy Chrome extension manifest + service worker into dist/
#   3. Generate extension icons from assets/icon.png
#   4. Extract inline scripts into separate files (CSP compliance)
# ─────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
EXT_DIR="$ROOT/chrome-extension"

echo "==> Building Expo web export..."
npx expo export --platform web

echo "==> Copying Chrome extension files into dist/..."
cp "$EXT_DIR/manifest.json" "$DIST/manifest.json"
cp "$EXT_DIR/background.js"  "$DIST/background.js"

# ── Generate extension icons ──────────────────────────────
echo "==> Generating extension icons..."
ICON_SRC="$ROOT/assets/icon.png"
ICON_DIR="$DIST/icons"
mkdir -p "$ICON_DIR"

if command -v convert &>/dev/null; then
  # ImageMagick is available
  for size in 16 32 48 128; do
    convert "$ICON_SRC" -resize "${size}x${size}" "$ICON_DIR/icon-${size}.png"
  done
elif command -v sips &>/dev/null; then
  # macOS built-in
  for size in 16 32 48 128; do
    sips -z "$size" "$size" "$ICON_SRC" --out "$ICON_DIR/icon-${size}.png" >/dev/null
  done
else
  echo "WARNING: Neither ImageMagick (convert) nor sips found."
  echo "         Copying the original icon as all sizes — replace manually with properly sized PNGs."
  for size in 16 32 48 128; do
    cp "$ICON_SRC" "$ICON_DIR/icon-${size}.png"
  done
fi

# ── Rename _expo → expo (Chrome disallows leading underscores) ──
# Expo's web export places bundled assets in a "_expo" directory.
# Chrome extensions reserve filenames starting with "_", so we rename
# the directory and rewrite all references in the generated files.
echo "==> Renaming _expo directory (Chrome reserves underscore-prefixed names)..."
if [ -d "$DIST/_expo" ]; then
  mv "$DIST/_expo" "$DIST/expo"
  # Update all references in HTML, JS, JSON, and source map files.
  # Detect GNU vs BSD sed for portable in-place editing.
  if sed --version &>/dev/null 2>&1; then
    SED_INPLACE=(sed -i)          # GNU sed
  else
    SED_INPLACE=(sed -i '')       # BSD/macOS sed
  fi
  find "$DIST" -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' -o -name '*.map' \) \
    -exec "${SED_INPLACE[@]}" -e 's|_expo/|expo/|g' -e 's|"_expo"|"expo"|g' {} +
  echo "   Renamed _expo → expo and updated all references."
else
  echo "   No _expo directory found — skipping rename."
fi

# ── CSP: extract inline scripts from index.html ──────────
# Chrome Manifest V3 forbids inline <script> tags.  Expo's web export may
# include small inline scripts (e.g. for async chunk loading).  We extract
# each one into a separate .js file and replace it with a <script src="…">.
echo "==> Extracting inline scripts for CSP compliance..."

INDEX="$DIST/index.html"
if [ -f "$INDEX" ]; then
  # Use a node one-liner for reliable HTML processing
  node -e "
    const fs = require('fs');
    let html = fs.readFileSync('$INDEX', 'utf8');
    let counter = 0;
    html = html.replace(/<script>([\s\S]*?)<\/script>/gi, (match, body) => {
      // Skip empty script tags
      if (!body.trim()) return match;
      const name = 'inline-script-' + counter++ + '.js';
      fs.writeFileSync('$DIST/' + name, body);
      return '<script src=\"' + name + '\"></script>';
    });
    fs.writeFileSync('$INDEX', html);
    if (counter > 0) {
      console.log('   Extracted ' + counter + ' inline script(s).');
    } else {
      console.log('   No inline scripts found — nothing to extract.');
    }
  "
fi

echo ""
echo "==> Chrome extension built successfully in dist/"
echo "    Load it in chrome://extensions (Developer mode → Load unpacked)."
