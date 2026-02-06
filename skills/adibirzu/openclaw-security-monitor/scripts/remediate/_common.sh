#!/bin/bash
# OpenClaw Security Monitor - Shared Remediation Helpers
# Sourced by each per-check remediation script
# https://github.com/adibirzu/openclaw-security-monitor

OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
SKILLS_DIR="$OPENCLAW_DIR/workspace/skills"
LOG_DIR="$OPENCLAW_DIR/logs"
LOG_FILE="$LOG_DIR/remediation.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

FIXED=0
FAILED=0
AUTO=false
DRY_RUN=false

# Parse flags
for arg in "$@"; do
    case "$arg" in
        --yes|-y) AUTO=true ;;
        --dry-run) DRY_RUN=true ;;
    esac
done

mkdir -p "$LOG_DIR" 2>/dev/null

log() {
    local msg="[$TIMESTAMP] $1"
    echo "$msg"
    if ! $DRY_RUN; then
        echo "$msg" >> "$LOG_FILE" 2>/dev/null
    fi
}

confirm() {
    local prompt="$1"
    if $AUTO; then return 0; fi
    printf "%s [y/N] " "$prompt"
    read -r answer
    [[ "$answer" =~ ^[Yy] ]]
}

fix_perms() {
    local target="$1"
    local mode="$2"
    local label="$3"
    if [ ! -e "$target" ]; then
        return 1
    fi
    local current
    current=$(stat -f "%Lp" "$target" 2>/dev/null || stat -c "%a" "$target" 2>/dev/null)
    if [ "$current" = "$mode" ]; then
        return 1  # already correct
    fi
    if $DRY_RUN; then
        log "  [DRY-RUN] Would chmod $mode $target ($label, currently $current)"
        FIXED=$((FIXED + 1))
        return 0
    fi
    if chmod "$mode" "$target" 2>/dev/null; then
        log "  FIXED: chmod $mode $target ($label, was $current)"
        FIXED=$((FIXED + 1))
    else
        log "  FAILED: chmod $mode $target ($label)"
        FAILED=$((FAILED + 1))
    fi
}

# Print guidance instructions (for guidance-only scripts)
# Accepts multiple arguments or reads from stdin (heredoc)
guidance() {
    echo ""
    echo "  MANUAL ACTION REQUIRED:"
    if [ $# -gt 0 ]; then
        for line in "$@"; do
            echo "  $line"
        done
    else
        while IFS= read -r line; do
            echo "  $line"
        done
    fi
    echo ""
}

# Exit with appropriate code
# 0 = fixed something, 1 = failed, 2 = nothing to fix / not applicable
finish() {
    if [ "$FIXED" -gt 0 ] && [ "$FAILED" -eq 0 ]; then
        exit 0
    elif [ "$FAILED" -gt 0 ]; then
        exit 1
    else
        exit 2
    fi
}
