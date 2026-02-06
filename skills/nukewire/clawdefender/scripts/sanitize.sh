#!/bin/bash
# sanitize.sh - Universal input sanitizer for external content
# Wraps ClawDefender to check any text before Vergil processes it
#
# Usage:
#   echo "email content" | sanitize.sh
#   sanitize.sh "some text to check"
#   gog gmail read <id> | sanitize.sh
#   curl -s <api> | sanitize.sh --json
#
# Modes:
#   (default)   Check text, output original if clean, warn if suspicious
#   --json      Parse JSON, check string fields, output with warnings
#   --strict    Block (exit 1) if injection detected
#   --silent    No warnings, just filter
#   --report    Output detection report only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAWDEFENDER="$SCRIPT_DIR/clawdefender.sh"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

MODE="default"
STRICT=false
SILENT=false
REPORT_ONLY=false

# Parse flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --json) MODE="json"; shift ;;
        --strict) STRICT=true; shift ;;
        --silent) SILENT=true; shift ;;
        --report) REPORT_ONLY=true; shift ;;
        --help|-h)
            echo "sanitize.sh - Universal input sanitizer"
            echo ""
            echo "Usage:"
            echo "  echo 'text' | sanitize.sh [options]"
            echo "  sanitize.sh [options] 'text to check'"
            echo ""
            echo "Options:"
            echo "  --json     Parse JSON input, check all string values"
            echo "  --strict   Exit with error if injection detected"
            echo "  --silent   Suppress warnings, just output clean/flagged"
            echo "  --report   Output detection report only (no passthrough)"
            echo "  --help     Show this help"
            echo ""
            echo "Examples:"
            echo "  gog gmail read abc123 | sanitize.sh"
            echo "  curl -s trello.com/api/... | sanitize.sh --json"
            echo "  gh issue view 42 --json body | sanitize.sh --json --strict"
            exit 0
            ;;
        *)
            # Treat as input text
            INPUT="$1"
            shift
            ;;
    esac
done

# Get input from stdin or argument
if [[ -z "${INPUT:-}" ]]; then
    if [[ -t 0 ]]; then
        echo "Error: No input provided. Pipe text or pass as argument." >&2
        exit 1
    fi
    INPUT=$(cat)
fi

# Run through ClawDefender prompt check
RESULT=$("$CLAWDEFENDER" --check-prompt <<< "$INPUT" 2>&1) || true

# Parse result
if echo "$RESULT" | grep -q "CRITICAL\|WARNING"; then
    # Injection detected
    SEVERITY="WARNING"
    echo "$RESULT" | grep -q "CRITICAL" && SEVERITY="CRITICAL"
    
    # Extract pattern matches
    PATTERNS=$(echo "$RESULT" | grep -oE "Pattern: [^(]+" | head -3 | tr '\n' ', ' | sed 's/, $//')
    
    if $REPORT_ONLY; then
        echo "⚠️ INJECTION DETECTED [$SEVERITY]"
        echo "Patterns: $PATTERNS"
        echo ""
        echo "--- Raw Detection ---"
        echo "$RESULT"
        exit 0
    fi
    
    if $STRICT; then
        if ! $SILENT; then
            echo -e "${RED}⛔ BLOCKED: Prompt injection detected [$SEVERITY]${NC}" >&2
            echo -e "${YELLOW}Patterns: $PATTERNS${NC}" >&2
        fi
        exit 1
    fi
    
    if ! $SILENT; then
        echo -e "${YELLOW}⚠️  SUSPICIOUS CONTENT DETECTED [$SEVERITY]${NC}" >&2
        echo -e "${YELLOW}Patterns: $PATTERNS${NC}" >&2
        echo -e "${YELLOW}--- Content follows (review carefully) ---${NC}" >&2
    fi
    
    # Output with visible warning marker
    echo "⚠️ [FLAGGED - Potential prompt injection detected]"
    echo "$INPUT"
    echo "⚠️ [END FLAGGED CONTENT]"
else
    # Clean - pass through
    if $REPORT_ONLY; then
        echo "✅ Clean - no injection patterns detected"
        exit 0
    fi
    
    if ! $SILENT; then
        : # Could add "✅ Clean" to stderr but that's noisy
    fi
    
    echo "$INPUT"
fi
