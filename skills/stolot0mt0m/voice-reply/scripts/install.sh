#!/bin/bash
# voice-reply skill - Installation Script
# Installs sherpa-onnx runtime and Piper voice models
#
# Usage: sudo ./install.sh [--german-only|--english-only|--all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Voice Reply Skill Installer ===${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo ./install.sh)${NC}"
    exit 1
fi

# Parse arguments
INSTALL_GERMAN=true
INSTALL_ENGLISH=true

case "${1:-all}" in
    --german-only)
        INSTALL_ENGLISH=false
        ;;
    --english-only)
        INSTALL_GERMAN=false
        ;;
    --all|"")
        ;;
    *)
        echo "Usage: $0 [--german-only|--english-only|--all]"
        exit 1
        ;;
esac

# Install ffmpeg if not present
echo -e "${YELLOW}[1/4] Checking ffmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg..."
    apt update && apt install -y ffmpeg
else
    echo "ffmpeg already installed."
fi

# Install sherpa-onnx
echo ""
echo -e "${YELLOW}[2/4] Installing sherpa-onnx runtime...${NC}"
SHERPA_VERSION="v1.12.23"
SHERPA_DIR="/opt/sherpa-onnx"

if [ -x "$SHERPA_DIR/bin/sherpa-onnx-offline-tts" ]; then
    echo "sherpa-onnx already installed at $SHERPA_DIR"
else
    mkdir -p "$SHERPA_DIR"
    cd "$SHERPA_DIR"
    echo "Downloading sherpa-onnx $SHERPA_VERSION..."
    curl -L -o sherpa.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/${SHERPA_VERSION}/sherpa-onnx-${SHERPA_VERSION}-linux-x64-shared.tar.bz2"
    echo "Extracting..."
    tar -xjf sherpa.tar.bz2 --strip-components=1
    rm sherpa.tar.bz2
    echo -e "${GREEN}sherpa-onnx installed successfully.${NC}"
fi

# Install voice models
echo ""
echo -e "${YELLOW}[3/4] Installing Piper voice models...${NC}"
VOICES_DIR="/opt/piper-voices"
mkdir -p "$VOICES_DIR"
cd "$VOICES_DIR"

if [ "$INSTALL_GERMAN" = true ]; then
    if [ -d "$VOICES_DIR/vits-piper-de_DE-thorsten-medium" ]; then
        echo "German voice (thorsten) already installed."
    else
        echo "Downloading German voice (thorsten-medium)..."
        curl -L -o thorsten.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-de_DE-thorsten-medium.tar.bz2"
        tar -xjf thorsten.tar.bz2
        rm thorsten.tar.bz2
        echo -e "${GREEN}German voice installed.${NC}"
    fi
fi

if [ "$INSTALL_ENGLISH" = true ]; then
    if [ -d "$VOICES_DIR/vits-piper-en_US-ryan-high" ]; then
        echo "English voice (ryan) already installed."
    else
        echo "Downloading English voice (ryan-high)..."
        curl -L -o ryan.tar.bz2 "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-ryan-high.tar.bz2"
        tar -xjf ryan.tar.bz2
        rm ryan.tar.bz2
        echo -e "${GREEN}English voice installed.${NC}"
    fi
fi

# Configuration info
echo ""
echo -e "${YELLOW}[4/4] Configuration...${NC}"
echo ""
echo "Add these environment variables to your OpenClaw service:"
echo ""
echo -e "${GREEN}  SHERPA_ONNX_DIR=/opt/sherpa-onnx${NC}"
echo -e "${GREEN}  PIPER_VOICES_DIR=/opt/piper-voices${NC}"
echo ""

# Test installation
echo -e "${YELLOW}Testing installation...${NC}"
TEST_OUTPUT=$("$SHERPA_DIR/bin/sherpa-onnx-offline-tts" \
    --vits-model="$VOICES_DIR/vits-piper-de_DE-thorsten-medium/de_DE-thorsten-medium.onnx" \
    --vits-tokens="$VOICES_DIR/vits-piper-de_DE-thorsten-medium/tokens.txt" \
    --vits-data-dir="$VOICES_DIR/vits-piper-de_DE-thorsten-medium/espeak-ng-data" \
    --output-filename="/tmp/test-voice-reply.wav" \
    "Test" 2>&1 || true)

if [ -f "/tmp/test-voice-reply.wav" ]; then
    rm /tmp/test-voice-reply.wav
    echo -e "${GREEN}Installation successful!${NC}"
else
    echo -e "${RED}Warning: Test failed. Please check the installation.${NC}"
fi

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Disk usage:"
du -sh "$SHERPA_DIR" "$VOICES_DIR" 2>/dev/null || true
