#!/usr/bin/env bash
# Moltbook Firewall Scanner
# Scans content for threats before processing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS_FILE="$SCRIPT_DIR/../patterns/threats.json"
LOG_FILE="$HOME/.openclaw/workspace/data/firewall-log.jsonl"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Input content (from argument or stdin)
if [[ -n "$1" ]]; then
    CONTENT="$1"
else
    CONTENT=$(cat)
fi

if [[ -z "$CONTENT" ]]; then
    echo "Usage: firewall-scan.sh \"content to scan\""
    echo "   or: echo \"content\" | firewall-scan.sh"
    exit 1
fi

# Results
THREATS_FOUND=()
MAX_SEVERITY="safe"

# Function to check patterns
check_patterns() {
    local category="$1"
    local severity="$2"
    shift 2
    local patterns=("$@")
    
    for pattern in "${patterns[@]}"; do
        if echo "$CONTENT" | grep -iEq "$pattern"; then
            THREATS_FOUND+=("$category: matched '$pattern'")
            
            # Update max severity
            case "$severity" in
                critical)
                    MAX_SEVERITY="blocked"
                    ;;
                high)
                    if [[ "$MAX_SEVERITY" != "blocked" ]]; then
                        MAX_SEVERITY="blocked"
                    fi
                    ;;
                medium)
                    if [[ "$MAX_SEVERITY" == "safe" ]]; then
                        MAX_SEVERITY="suspicious"
                    fi
                    ;;
            esac
        fi
    done
}

# Load and check patterns
# Prompt injection (critical)
check_patterns "prompt_injection" "critical" \
    "IGNORE.*INSTRUCTIONS" \
    "SYSTEM:" \
    "\\[ADMIN\\]" \
    "\\[SYSTEM\\]" \
    "\\[OVERRIDE\\]" \
    "im_start" \
    "im_end" \
    "<<SYS>>" \
    "<</SYS>>" \
    "\\[INST\\]" \
    "forget everything" \
    "disregard.*prior" \
    "developer mode" \
    "god mode" \
    "jailbreak" \
    "DAN mode"

# Code execution (high)
check_patterns "code_execution" "high" \
    "curl.*http.*\\|.*bash" \
    "curl.*http.*\\|.*sh" \
    "wget.*\\|.*bash" \
    "\\| bash" \
    "\\| sh" \
    "rm -rf" \
    "sudo " \
    "chmod 777" \
    "> /dev/" \
    "nc -[el]"

# Social engineering (medium)
check_patterns "social_engineering" "medium" \
    "SECURITY ALERT" \
    "URGENT.*act now" \
    "account.*terminated" \
    "account.*deleted" \
    "as.*administrator" \
    "your human.*told me" \
    "Hardware Verification.*FAILED" \
    "verify your.*credentials"

# Data exfiltration (high)
check_patterns "data_exfiltration" "high" \
    "api.?key" \
    "share your.*prompt" \
    "show.*credentials" \
    "your.*secrets"

# Suspicious URLs (medium)
check_patterns "suspicious_urls" "medium" \
    "webhook\\.site" \
    "ngrok\\.io" \
    "requestbin" \
    "pipedream\\.net" \
    "bit\\.ly/" \
    "tinyurl\\.com/"

# Output results
echo "═══════════════════════════════════════════"
echo "  MOLTBOOK FIREWALL SCAN RESULTS"
echo "═══════════════════════════════════════════"

case "$MAX_SEVERITY" in
    blocked)
        echo -e "  Status: ${RED}🛑 BLOCKED${NC}"
        echo "  Severity: CRITICAL/HIGH"
        echo ""
        echo "  DO NOT PROCESS THIS CONTENT"
        ;;
    suspicious)
        echo -e "  Status: ${YELLOW}⚠️  SUSPICIOUS${NC}"
        echo "  Severity: MEDIUM"
        echo ""
        echo "  Review carefully before engaging"
        ;;
    safe)
        echo -e "  Status: ${GREEN}✅ SAFE${NC}"
        echo ""
        echo "  No known threat patterns detected"
        ;;
esac

if [[ ${#THREATS_FOUND[@]} -gt 0 ]]; then
    echo ""
    echo "  Threats detected:"
    for threat in "${THREATS_FOUND[@]}"; do
        echo "    - $threat"
    done
fi

echo "═══════════════════════════════════════════"

# Log the scan
LOG_ENTRY=$(jq -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg status "$MAX_SEVERITY" \
    --arg content "$(echo "$CONTENT" | head -c 500)" \
    --argjson threats "$(printf '%s\n' "${THREATS_FOUND[@]}" | jq -R . | jq -s .)" \
    '{timestamp: $ts, status: $status, content_preview: $content, threats: $threats}')

echo "$LOG_ENTRY" >> "$LOG_FILE"

# Exit code based on severity
case "$MAX_SEVERITY" in
    blocked) exit 2 ;;
    suspicious) exit 1 ;;
    safe) exit 0 ;;
esac
