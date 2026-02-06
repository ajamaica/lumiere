#!/bin/bash
# Camoufox Setup Script
# Run once to install Camoufox and dependencies

set -e

VENV_DIR="${CAMOUFOX_VENV:-$HOME/.openclaw/workspace/camoufox-env}"
PROFILE_DIR="${CAMOUFOX_PROFILE:-$HOME/.openclaw/camoufox-profile}"

echo "=== Camoufox Setup ==="
echo "venv: $VENV_DIR"
echo "profile: $PROFILE_DIR"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found"
    exit 1
fi

# Install python3-venv if needed (Ubuntu/Debian)
if ! python3 -m venv --help &> /dev/null; then
    echo "Installing python3-venv..."
    sudo apt install -y python3-venv python3-full || true
fi

# Create venv
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Install camoufox
echo "Installing camoufox..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install camoufox

# Create profile directory
mkdir -p "$PROFILE_DIR"

# Install Xvfb if not present (for headless servers)
if ! command -v xvfb-run &> /dev/null; then
    echo "Installing Xvfb..."
    sudo apt install -y xvfb || true
fi

# Test installation
echo "Testing Camoufox..."
python3 -c "from camoufox.sync_api import Camoufox; print('Camoufox OK!')"

echo ""
echo "=== Setup Complete ==="
echo "Activate with: source $VENV_DIR/bin/activate"
echo "Profile stored in: $PROFILE_DIR"
