#!/bin/bash

# Claude Code Daily Updater
# Checks GitHub for new releases and updates if available

set -e

LOG_FILE="$HOME/clawd/logs/claude-code-updates.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Timestamp function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Starting Claude Code update check ==="

# Get latest release from GitHub API
GITHUB_API="https://api.github.com/repos/anthropics/claude-code/releases/latest"

log "Fetching latest release from $GITHUB_API"
RESPONSE=$(curl -s "$GITHUB_API" 2>&1)

# Parse version from release tag
LATEST_VERSION=$(echo "$RESPONSE" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": "\(.*\)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    log "ERROR: Could not fetch latest version from GitHub"
    log "Response: $RESPONSE"
    exit 1
fi

log "Latest version available: $LATEST_VERSION"

# Check current installed version
# Try different possible installation locations
CURRENT_VERSION="not-installed"

if command -v claude-code &> /dev/null; then
    CURRENT_VERSION=$(claude-code --version 2>/dev/null || echo "unknown")
elif [ -f "$HOME/.local/bin/claude-code" ]; then
    CURRENT_VERSION=$("$HOME/.local/bin/claude-code" --version 2>/dev/null || echo "unknown")
elif [ -f "/usr/local/bin/claude-code" ]; then
    CURRENT_VERSION=$(/usr/local/bin/claude-code --version 2>/dev/null || echo "unknown")
fi

log "Currently installed version: $CURRENT_VERSION"

# Compare versions
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    log "Status: Already up to date with $LATEST_VERSION"
    echo "✓ Claude Code is up to date ($LATEST_VERSION)" >> "$LOG_FILE"
else
    log "Status: Update available! $CURRENT_VERSION → $LATEST_VERSION"
    
    # Download the latest release
    DOWNLOAD_URL="https://github.com/anthropics/claude-code/releases/download/$LATEST_VERSION/claude-code"
    TEMP_FILE="/tmp/claude-code-$LATEST_VERSION"
    
    log "Downloading from: $DOWNLOAD_URL"
    
    if curl -L -o "$TEMP_FILE" "$DOWNLOAD_URL" 2>&1; then
        log "Download successful"
        
        # Install to ~/.local/bin (preferred location)
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
        
        chmod +x "$TEMP_FILE"
        mv "$TEMP_FILE" "$INSTALL_DIR/claude-code"
        
        log "Installed to $INSTALL_DIR/claude-code"
        
        # Verify installation
        INSTALLED_VERSION=$("$INSTALL_DIR/claude-code" --version 2>/dev/null || echo "unknown")
        log "Verified installed version: $INSTALLED_VERSION"
        
        log "✓ Successfully updated Claude Code to $LATEST_VERSION"
        
        # Report summary
        echo "" >> "$LOG_FILE"
        echo "UPDATE SUMMARY:" >> "$LOG_FILE"
        echo "  From: $CURRENT_VERSION" >> "$LOG_FILE"
        echo "  To: $LATEST_VERSION" >> "$LOG_FILE"
        echo "  Location: $INSTALL_DIR/claude-code" >> "$LOG_FILE"
        echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
    else
        log "ERROR: Download failed"
        exit 1
    fi
fi

log "=== Update check complete ==="
echo "" >> "$LOG_FILE"

# Send report to Telegram if TELEGRAM_CHAT_ID is set
if [ -n "$TELEGRAM_CHAT_ID" ] && command -v clawdbot &> /dev/null; then
    # Extract last few lines for the report
    REPORT=$(tail -10 "$LOG_FILE")
    clawdbot message send --message "Claude Code Update Report:\n\n$REPORT" 2>/dev/null || true
fi
