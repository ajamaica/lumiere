#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 28: Node.js version and CVE status"

if ! command -v node &>/dev/null; then
    log "Node.js not found, skipping check"
    finish
fi

NODE_VERSION=$(node --version 2>/dev/null)
log "Found Node.js version: $NODE_VERSION"

# Parse version (e.g., v22.12.0 -> major=22, minor=12)
VERSION_NUM=$(echo "$NODE_VERSION" | sed 's/^v//')
MAJOR=$(echo "$VERSION_NUM" | cut -d. -f1)
MINOR=$(echo "$VERSION_NUM" | cut -d. -f2)

log "Parsed version: major=$MAJOR, minor=$MINOR"

NEEDS_UPGRADE=0

# Check if version is below minimum recommended
if [[ $MAJOR -lt 22 ]]; then
    NEEDS_UPGRADE=1
    log "WARNING: Node.js $MAJOR is below recommended minimum (22.x)"
elif [[ $MAJOR -eq 22 && $MINOR -lt 12 ]]; then
    NEEDS_UPGRADE=1
    log "WARNING: Node.js $MAJOR.$MINOR has known CVEs, upgrade to 22.12+ recommended"
fi

if [[ $NEEDS_UPGRADE -eq 1 ]]; then
    # Detect OS for specific upgrade instructions
    OS_TYPE=$(uname -s)

    case "$OS_TYPE" in
        Darwin)
            INSTALL_CMD="brew upgrade node"
            ALT_CMD="Download from https://nodejs.org/ or use nvm: nvm install 22"
            ;;
        Linux)
            INSTALL_CMD="nvm install 22 && nvm use 22"
            ALT_CMD="Or use package manager: sudo apt update && sudo apt install nodejs (Ubuntu/Debian)"
            ;;
        *)
            INSTALL_CMD="nvm install 22 && nvm use 22"
            ALT_CMD="Or download from https://nodejs.org/"
            ;;
    esac

    guidance "Node.js Version Upgrade Required" \
        "Current version $NODE_VERSION has known security vulnerabilities." \
        "" \
        "RECOMMENDED: Upgrade to Node.js 22.12 or later" \
        "" \
        "Upgrade instructions for $OS_TYPE:" \
        "1. Using nvm (recommended):" \
        "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash" \
        "   nvm install 22" \
        "   nvm use 22" \
        "   nvm alias default 22" \
        "" \
        "2. Using package manager:" \
        "   $INSTALL_CMD" \
        "" \
        "3. Alternative:" \
        "   $ALT_CMD" \
        "" \
        "After upgrade, verify with: node --version" \
        "" \
        "Known CVEs in older versions:" \
        "- CVE-2024-27982: HTTP Request Smuggling" \
        "- CVE-2024-27983: Path Traversal" \
        "- CVE-2024-22025: Denial of Service" \
        "" \
        "Reference: https://nodejs.org/en/blog/vulnerability/"
    ((FAILED++))
else
    log "Node.js version is up to date and secure"
fi

finish
