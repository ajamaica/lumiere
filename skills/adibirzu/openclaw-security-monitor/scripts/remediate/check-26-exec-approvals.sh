#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "Check 26: Fix exec-approvals.json perms and config"

EXEC_APPROVALS="$OPENCLAW_DIR/exec-approvals.json"

if [[ ! -f "$EXEC_APPROVALS" ]]; then
    log "exec-approvals.json not found, nothing to fix"
    finish
fi

NEEDS_FIX=0

# Check and fix file permissions
if fix_perms "$EXEC_APPROVALS" 600 "Restrict exec-approvals.json to owner-only"; then
    ((FIXED++))
    NEEDS_FIX=1
fi

# Check for unsafe configuration patterns
if [[ -r "$EXEC_APPROVALS" ]]; then
    log "Scanning exec-approvals.json for unsafe patterns..."

    UNSAFE_PATTERNS=0

    # Check for wildcard allow patterns
    if grep -q '"security.*allow"' "$EXEC_APPROVALS" 2>/dev/null; then
        log "WARNING: Found security.*allow pattern (overly permissive)"
        ((UNSAFE_PATTERNS++))
    fi

    if grep -q '"ask.*off"' "$EXEC_APPROVALS" 2>/dev/null; then
        log "WARNING: Found ask.*off pattern (disables safety prompts)"
        ((UNSAFE_PATTERNS++))
    fi

    # Check for autoApprove patterns
    if grep -qi '"autoApprove".*true' "$EXEC_APPROVALS" 2>/dev/null; then
        log "WARNING: Found autoApprove enabled (bypasses user confirmation)"
        ((UNSAFE_PATTERNS++))
    fi

    # Check for wildcard command approvals
    if grep -q '"command".*"\*"' "$EXEC_APPROVALS" 2>/dev/null; then
        log "WARNING: Found wildcard command approval (allows all commands)"
        ((UNSAFE_PATTERNS++))
    fi

    if [[ $UNSAFE_PATTERNS -gt 0 ]]; then
        guidance "Unsafe exec-approvals.json Configuration" \
            "Found $UNSAFE_PATTERNS unsafe pattern(s) in exec-approvals.json:" \
            "1. Remove wildcard allow patterns (security.*allow, ask.*off)" \
            "2. Disable autoApprove for sensitive commands" \
            "3. Use specific command allowlists instead of wildcards" \
            "4. Review and approve each execution approval manually" \
            "5. Backup before editing: cp $EXEC_APPROVALS ${EXEC_APPROVALS}.bak" \
            "6. Reference: https://docs.openclaw.ai/security/execution-approvals"
        ((FAILED++))
        NEEDS_FIX=1
    fi
fi

if [[ $NEEDS_FIX -eq 0 ]]; then
    log "exec-approvals.json configuration is secure"
fi

finish
