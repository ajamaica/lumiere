#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status.

log() {
    echo -e "\033[1;32m[GMK-SETUP] $1\033[0m"
}

error() {
    echo -e "\033[1;31m[ERROR] $1\033[0m"
    exit 1
}

log "Starting hardened onboarding for GMKtec EVO-X2..."

# 1. Dependency Pre-Flight
log "Checking dependencies..."
command -v curl >/dev/null 2>&1 || { log "Installing curl..."; apt-get update && apt-get install -y curl; }

# 2. Docker
if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $SUDO_USER
else
    log "Docker already installed."
fi

# 3. Node/NPM (via Volta for stability)
if ! command -v node >/dev/null 2>&1; then
    log "Installing Node.js via Volta..."
    curl https://get.volta.sh | bash
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
    volta install node@22
else
    log "Node.js already installed."
fi

# 4. Tailscale
if ! command -v tailscale >/dev/null 2>&1; then
    log "Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
else
    log "Tailscale already installed."
fi

# 5. OpenClaw Agent
log "Installing OpenClaw..."
npm install -g openclaw

# 6. Verification
log "Verifying installation..."
docker --version || error "Docker failed"
node --version || error "Node failed"
openclaw --version || error "OpenClaw failed"

log "✅ GMKtec Node Ready. Run 'openclaw configure' to link."
