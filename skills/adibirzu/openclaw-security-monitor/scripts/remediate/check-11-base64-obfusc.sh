#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log "CHECK 11: Remove skills with base64 payloads"

# Base64 decode patterns across different languages/tools
BASE64_PATTERNS=(
    "base64 -d"
    "base64 --decode"
    "atob\("
    "Buffer\.from.*base64"
    "python.*b64decode"
    "import base64.*decode"
    "echo.*\|.*base64 -d"
)

FOUND_ISSUES=0
MATCHED_SKILLS=()

log "Scanning skills for base64 decode patterns..."

# Scan all script files in skills
while IFS= read -r -d '' skillfile; do
    # Skip security-monitor
    if [[ "$skillfile" == *"security-monitor"* ]]; then
        continue
    fi

    for pattern in "${BASE64_PATTERNS[@]}"; do
        if grep -qE "$pattern" "$skillfile" 2>/dev/null; then
            skill_dir=$(dirname "$skillfile")
            skill_name=$(basename "$skill_dir")

            # Avoid duplicates
            if [[ ! " ${MATCHED_SKILLS[@]} " =~ " ${skill_name} " ]]; then
                log "[!] Found base64 decode in skill: $skill_name"
                log "    File: $skillfile"
                log "    Pattern: $pattern"

                # Show the actual line
                log "    Line:"
                grep -n "$pattern" "$skillfile" | head -1 | sed 's/^/      /' || true

                MATCHED_SKILLS+=("$skill_name")
                FOUND_ISSUES=$((FOUND_ISSUES + 1))
            fi
            break
        fi
    done
done < <(find "$SKILLS_DIR" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" \) -print0 2>/dev/null)

if [ $FOUND_ISSUES -eq 0 ]; then
    log "[OK] No base64 obfuscation patterns found"
    exit 2
fi

log ""
log "=========================================="
log "GUIDANCE: Manual Review Required"
log "=========================================="
log ""
log "Found $FOUND_ISSUES skill(s) using base64 decode operations."
log ""
log "IMPORTANT: Base64 encoding is sometimes used legitimately, but attackers"
log "commonly use it to hide malicious payloads."
log ""
log "Affected skills:"
for skill in "${MATCHED_SKILLS[@]}"; do
    log "  - $skill"
done
log ""
log "RECOMMENDED ACTIONS:"
log "1. Review each skill listed above to understand WHY it decodes base64"
log "2. Check if there are long base64 strings that decode to shell commands"
log "3. Verify the decoded content is legitimate (if unsure, decode manually):"
log "   echo 'BASE64_STRING' | base64 -d"
log ""
log "4. If confirmed malicious, remove the skill:"
log "   rm -rf \"\$SKILLS_DIR/<skill-name>\""
log ""
log "5. After removal, verify with:"
log "   ./check-11-base64-obfusc.sh"
log ""

guidance "Manual review of base64-using skills required"
exit 2
