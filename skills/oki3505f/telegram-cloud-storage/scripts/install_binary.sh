#!/bin/bash
# install_binary.sh - Portable Teldrive Downloader
VERSION="1.8.0"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$SKILL_DIR/bin"
TEMP_DIR="$SKILL_DIR/temp_install"

mkdir -p "$BIN_DIR"
mkdir -p "$TEMP_DIR"

echo "Downloading Teldrive $VERSION..."
URL="https://github.com/tgdrive/teldrive/releases/download/$VERSION/teldrive-$VERSION-linux-amd64.tar.gz"

curl -L -o "$TEMP_DIR/teldrive.tar.gz" "$URL"
tar -xzf "$TEMP_DIR/teldrive.tar.gz" -C "$TEMP_DIR"
mv "$TEMP_DIR/teldrive" "$BIN_DIR/teldrive"
chmod +x "$BIN_DIR/teldrive"

rm -rf "$TEMP_DIR"
echo "Teldrive binary installed to $BIN_DIR/teldrive"
