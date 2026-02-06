#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 13: Bind gateway to localhost, enable auth"

# Check if openclaw CLI is available
if ! command -v openclaw &> /dev/null; then
    log "[SKIP] openclaw CLI not found, cannot check gateway config"
    exit 2
fi

NEEDS_FIX=0
BIND_VALUE=""
AUTH_VALUE=""

# Get current gateway bind setting
log "Checking gateway.bind configuration..."
BIND_VALUE=$(openclaw config get gateway.bind 2>/dev/null || echo "unknown")
log "Current gateway.bind: $BIND_VALUE"

if [[ "$BIND_VALUE" == "lan" ]] || [[ "$BIND_VALUE" == "0.0.0.0" ]]; then
    log "[!] Gateway is bound to $BIND_VALUE (exposed to network)"
    NEEDS_FIX=$((NEEDS_FIX + 1))
fi

# Get current auth mode
log "Checking gateway.auth.mode configuration..."
AUTH_VALUE=$(openclaw config get gateway.auth.mode 2>/dev/null || echo "unknown")
log "Current gateway.auth.mode: $AUTH_VALUE"

if [[ "$AUTH_VALUE" == "none" ]] || [[ "$AUTH_VALUE" == "off" ]]; then
    log "[!] Gateway authentication is disabled ($AUTH_VALUE)"
    NEEDS_FIX=$((NEEDS_FIX + 1))
fi

if [ $NEEDS_FIX -eq 0 ]; then
    log "[OK] Gateway configuration is secure"
    exit 2
fi

log ""
log "Gateway configuration needs to be secured."

if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] Would apply these fixes:"
    if [[ "$BIND_VALUE" == "lan" ]] || [[ "$BIND_VALUE" == "0.0.0.0" ]]; then
        log "  - Set gateway.bind to localhost"
    fi
    if [[ "$AUTH_VALUE" == "none" ]] || [[ "$AUTH_VALUE" == "off" ]]; then
        log "  - Set gateway.auth.mode to token"
    fi
    exit 2
fi

# Prompt for confirmation if not auto mode
if [ "$AUTO" != true ]; then
    log ""
    if [[ "$BIND_VALUE" == "lan" ]] || [[ "$BIND_VALUE" == "0.0.0.0" ]]; then
        confirm "Set gateway.bind to localhost?" || exit 2
    fi
    if [[ "$AUTH_VALUE" == "none" ]] || [[ "$AUTH_VALUE" == "off" ]]; then
        confirm "Enable gateway authentication (token mode)?" || exit 2
    fi
fi

# Apply fixes
FIXED_COUNT=0

if [[ "$BIND_VALUE" == "lan" ]] || [[ "$BIND_VALUE" == "0.0.0.0" ]]; then
    log "Setting gateway.bind to localhost..."
    if openclaw config set gateway.bind localhost 2>&1 | tee -a "$LOG_FILE"; then
        log "[FIXED] Gateway now bound to localhost"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    else
        log "[FAILED] Could not set gateway.bind"
        exit 1
    fi
fi

if [[ "$AUTH_VALUE" == "none" ]] || [[ "$AUTH_VALUE" == "off" ]]; then
    log "Setting gateway.auth.mode to token..."
    if openclaw config set gateway.auth.mode token 2>&1 | tee -a "$LOG_FILE"; then
        log "[FIXED] Gateway authentication enabled"
        FIXED_COUNT=$((FIXED_COUNT + 1))
    else
        log "[FAILED] Could not set gateway.auth.mode"
        exit 1
    fi
fi

if [ $FIXED_COUNT -gt 0 ]; then
    log ""
    log "[SUCCESS] Gateway configuration secured"
    log "NOTE: You may need to restart OpenClaw for changes to take effect:"
    log "  openclaw restart"
    finish
else
    exit 1
fi
