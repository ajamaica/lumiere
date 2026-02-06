#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 14: Update OpenClaw, restrict gateway for CVE-2026-25253"

# Try to determine gateway port
GATEWAY_PORT=8080
if command -v openclaw &> /dev/null; then
    GATEWAY_PORT=$(openclaw config get gateway.port 2>/dev/null || echo "8080")
fi

log "Testing WebSocket security on port $GATEWAY_PORT..."

# Test command that will be used
TEST_CMD="curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: test' -H 'Origin: http://evil.com' http://localhost:$GATEWAY_PORT/ws 2>&1"

log "Verification command:"
log "  $TEST_CMD"
log ""

# Perform the test
RESPONSE=$(eval "$TEST_CMD" 2>&1 || true)

# Check if we got HTTP 101 (successful upgrade)
if echo "$RESPONSE" | grep -q "HTTP/1.1 101"; then
    log "[!] VULNERABLE: WebSocket accepted connection from evil origin"
    log ""
    log "Response excerpt:"
    echo "$RESPONSE" | head -10 | sed 's/^/  /'
    VULNERABLE=true
elif echo "$RESPONSE" | grep -q "Connection refused"; then
    log "[OK] Gateway is not running or not accessible"
    exit 2
elif echo "$RESPONSE" | grep -q "403\|401"; then
    log "[OK] WebSocket properly rejected unauthorized origin"
    exit 2
else
    log "[INFO] Unable to determine WebSocket security status"
    log "Response:"
    echo "$RESPONSE" | head -10 | sed 's/^/  /'
    VULNERABLE=false
fi

if [ "$VULNERABLE" != true ]; then
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Update Required"
log "=========================================="
log ""
log "Your OpenClaw installation is vulnerable to CVE-2026-25253."
log "The WebSocket gateway does not properly validate Origin headers."
log ""
log "RECOMMENDED ACTIONS:"
log "1. Update OpenClaw to the latest version:"
log "   openclaw update"
log "   # or"
log "   npm update -g openclaw"
log "   # or"
log "   brew upgrade openclaw"
log ""
log "2. Restrict gateway access (if update is not immediately available):"
log "   openclaw config set gateway.bind localhost"
log "   openclaw config set gateway.auth.mode token"
log "   openclaw restart"
log ""
log "3. Verify the fix:"
log "   $TEST_CMD"
log ""
log "4. Expected result: HTTP 403 or 401, NOT 101"
log ""
log "5. Check your version:"
log "   openclaw --version"
log ""

guidance "OpenClaw update required to fix CVE-2026-25253"
exit 2
